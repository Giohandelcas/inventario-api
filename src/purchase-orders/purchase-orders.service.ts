import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, PurchaseOrderStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(pagination: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        include: { items: true, supplier: true },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.purchaseOrder.count(),
    ]);
    return paginatedResult(data, total, pagination);
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { productVariant: true } }, supplier: true, inventoryMovements: true },
    });
    if (!po) throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    return po;
  }

  create(dto: CreatePurchaseOrderDto, orderedById: string) {
    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        orderedById,
        expectedDate: dto.expectedDate,
        notes: dto.notes,
        items: { create: dto.items },
      },
      include: { items: true },
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.assertExists(id);
    if (po.status !== PurchaseOrderStatus.BORRADOR) {
      throw new BadRequestException('Solo se puede editar una orden en estado BORRADOR');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: dto });
  }

  async markOrdered(id: string) {
    const po = await this.assertExists(id);
    if (po.status !== PurchaseOrderStatus.BORRADOR) {
      throw new BadRequestException('Solo una orden en BORRADOR puede pasar a ORDENADA');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.ORDENADA } });
  }

  async cancel(id: string) {
    const po = await this.assertExists(id);
    if (po.status === PurchaseOrderStatus.RECIBIDA) {
      throw new BadRequestException('No se puede cancelar una orden ya recibida');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.CANCELADA } });
  }

  /**
   * RF-08: recibir mercancía (total o parcial). Por cada item recibido,
   * incrementa el stock de su variante y registra un InventoryMovement
   * COMPRA_ENTRADA (RNF-01) — todo en una sola transacción de BD junto con
   * el avance de estado de la orden, para que nunca quede a medias.
   */
  async receive(id: string, dto: ReceivePurchaseOrderDto, performedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!po) throw new NotFoundException(`Orden de compra ${id} no encontrada`);
      if (po.status !== PurchaseOrderStatus.ORDENADA && po.status !== PurchaseOrderStatus.PARCIALMENTE_RECIBIDA) {
        throw new BadRequestException('Solo se puede recibir una orden en estado ORDENADA o PARCIALMENTE_RECIBIDA');
      }

      for (const receiveItem of dto.items) {
        const item = await tx.purchaseOrderItem.findUnique({ where: { id: receiveItem.purchaseOrderItemId } });
        if (!item || item.purchaseOrderId !== id) {
          throw new NotFoundException(`Item ${receiveItem.purchaseOrderItemId} no pertenece a la orden ${id}`);
        }
        const remaining = item.quantityOrdered - item.quantityReceived;
        if (receiveItem.quantityReceived > remaining) {
          throw new ConflictException(
            `Item ${item.id}: se intenta recibir ${receiveItem.quantityReceived} pero solo quedan ${remaining} pendientes`,
          );
        }

        await this.inventoryService.applyMovement(tx, {
          productVariantId: item.productVariantId,
          type: InventoryMovementType.COMPRA_ENTRADA,
          quantity: receiveItem.quantityReceived,
          purchaseOrderId: id,
          performedById,
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: receiveItem.quantityReceived } },
        });
      }

      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const fullyReceived = items.every((i) => i.quantityReceived >= i.quantityOrdered);
      const status = fullyReceived ? PurchaseOrderStatus.RECIBIDA : PurchaseOrderStatus.PARCIALMENTE_RECIBIDA;

      return tx.purchaseOrder.update({ where: { id }, data: { status }, include: { items: true } });
    });
  }

  private async assertExists(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    return po;
  }
}
