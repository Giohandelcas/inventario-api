import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, type Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

const DECREMENT_TYPES: readonly InventoryMovementType[] = [
  InventoryMovementType.VENTA_SALIDA,
  InventoryMovementType.AJUSTE_SALIDA,
  InventoryMovementType.DEVOLUCION_SALIDA,
];

export interface ApplyMovementInput {
  productVariantId: string;
  type: InventoryMovementType;
  quantity: number;
  reason?: string;
  purchaseOrderId?: string;
  orderId?: string;
  performedById?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Único punto del sistema que cambia ProductVariant.stock. SIEMPRE dentro
   * de una transacción (RNF-01), junto con la fila de InventoryMovement.
   *
   * Para las salidas usa un UPDATE atómico condicionado
   * (`WHERE stock >= quantity`) en vez de leer-luego-escribir: es la BD la
   * que garantiza que dos salidas concurrentes no puedan sobrevender el
   * mismo variant, sin necesidad de SELECT ... FOR UPDATE ni aislamiento
   * Serializable (más simple y sin transacciones que reintentar).
   *
   * Recibe `tx` para que PurchaseOrdersService/OrdersService puedan
   * componerlo dentro de su propia transacción más grande (ej. recibir una
   * orden de compra completa, o confirmar un pedido con varios items).
   */
  async applyMovement(tx: Prisma.TransactionClient, input: ApplyMovementInput) {
    const isDecrement = DECREMENT_TYPES.includes(input.type);

    if (isDecrement) {
      const result = await tx.productVariant.updateMany({
        where: { id: input.productVariantId, stock: { gte: input.quantity } },
        data: { stock: { decrement: input.quantity } },
      });
      if (result.count === 0) {
        throw new ConflictException(
          `Stock insuficiente para la variante ${input.productVariantId} (se pidieron ${input.quantity})`,
        );
      }
    } else {
      const result = await tx.productVariant.updateMany({
        where: { id: input.productVariantId },
        data: { stock: { increment: input.quantity } },
      });
      if (result.count === 0) {
        throw new NotFoundException(`Variante ${input.productVariantId} no encontrada`);
      }
    }

    return tx.inventoryMovement.create({
      data: {
        productVariantId: input.productVariantId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        purchaseOrderId: input.purchaseOrderId,
        orderId: input.orderId,
        performedById: input.performedById,
      },
    });
  }

  /** RF-03: ajustes manuales y devoluciones (no compra/venta, esas las disparan otros módulos). */
  createAdjustment(dto: CreateAdjustmentDto, performedById: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        productVariantId: dto.productVariantId,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
        performedById,
      }),
    );
  }

  /** RF-04: historial de movimientos, opcionalmente filtrado por variante. */
  async findMovements(pagination: PaginationQueryDto, productVariantId?: string) {
    const where = productVariantId ? { productVariantId } : {};
    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  /** RF-05: variantes por debajo de su umbral configurado. */
  findLowStockAlerts() {
    return this.prisma.$queryRaw`
      SELECT * FROM product_variants
      WHERE active = true AND stock <= "lowStockThreshold"
      ORDER BY stock ASC
    `;
  }
}
