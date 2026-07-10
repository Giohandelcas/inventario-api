import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, OrderStatus, type Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import type { AuthenticatedUser } from '../auth/types';
import { CreateOrderDto } from './dto/create-order.dto';

// Transiciones válidas de estado (RF-10). Las de venta las gestiona
// ADMIN/VENDEDOR, las logísticas ADMIN/BODEGA (matriz sección 9) — el guard
// de rol se aplica en el controller; acá solo se valida que la transición
// tenga sentido en el ciclo de vida del pedido.
const SALES_TRANSITIONS: Record<string, OrderStatus> = {
  confirm: OrderStatus.CONFIRMADO,
  markPaid: OrderStatus.PAGADO,
};
const LOGISTICS_TRANSITIONS: Record<string, OrderStatus> = {
  ship: OrderStatus.ENVIADO,
  deliver: OrderStatus.ENTREGADO,
};
const PREVIOUS_STATUS: Record<OrderStatus, OrderStatus | null> = {
  [OrderStatus.PENDIENTE]: null,
  [OrderStatus.CONFIRMADO]: OrderStatus.PENDIENTE,
  [OrderStatus.PAGADO]: OrderStatus.CONFIRMADO,
  [OrderStatus.ENVIADO]: OrderStatus.PAGADO,
  [OrderStatus.ENTREGADO]: OrderStatus.ENVIADO,
  [OrderStatus.CANCELADO]: null,
};
const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDIENTE,
  OrderStatus.CONFIRMADO,
  OrderStatus.PAGADO,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * RF-17/RF-18: checkout sin pago en línea, con decremento inmediato de
   * stock (decisión documentada en requerimientos.md sección 6). El
   * resolve-o-crea del Customer invitado ocurre FUERA de la transacción
   * principal (findOrCreateGuestByEmail usa su propia conexión) — la
   * atomicidad que de verdad importa para RNF-01 es orden+items+stock, no
   * la creación del Customer, que además es idempotente por email.
   */
  async checkout(dto: CreateOrderDto, user: AuthenticatedUser | undefined) {
    const customerId = await this.resolveCustomerId(dto, user);

    return this.prisma.$transaction(async (tx) => {
      const lineItems = await Promise.all(
        dto.items.map(async (item) => {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.productVariantId },
            include: { product: true },
          });
          if (!variant || !variant.active || !variant.product.active) {
            throw new NotFoundException(`Variante ${item.productVariantId} no disponible`);
          }
          const unitPrice = Number(variant.priceOverride ?? variant.product.basePrice);
          return {
            productVariantId: variant.id,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
          };
        }),
      );

      const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
      // v1 no modela impuestos/envío (ver "Fuera de Alcance" en requerimientos.md) — total = subtotal.
      const total = subtotal;

      const order = await tx.order.create({
        data: {
          customerId,
          subtotal,
          total,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          shippingAddress: dto.shippingAddress as Prisma.InputJsonValue | undefined,
          notes: dto.notes,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      for (const item of lineItems) {
        await this.inventoryService.applyMovement(tx, {
          productVariantId: item.productVariantId,
          type: InventoryMovementType.VENTA_SALIDA,
          quantity: item.quantity,
          orderId: order.id,
        });
      }

      return order;
    });
  }

  async findAll(pagination: PaginationQueryDto, user: AuthenticatedUser | undefined) {
    const where = user?.actorType === 'customer' ? { customerId: user.id } : {};
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  async findOne(id: string, user: AuthenticatedUser | undefined) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException(`Pedido ${id} no encontrado`);
    if (user?.actorType === 'customer' && order.customerId !== user.id) {
      throw new ForbiddenException('Este pedido no te pertenece');
    }
    return order;
  }

  async transitionStatus(id: string, transition: keyof typeof SALES_TRANSITIONS | keyof typeof LOGISTICS_TRANSITIONS) {
    const nextStatus = SALES_TRANSITIONS[transition] ?? LOGISTICS_TRANSITIONS[transition];
    const order = await this.assertExists(id);
    const expectedCurrent = PREVIOUS_STATUS[nextStatus];
    if (order.status !== expectedCurrent) {
      throw new BadRequestException(
        `No se puede pasar de '${order.status}' a '${nextStatus}' (se esperaba '${expectedCurrent}')`,
      );
    }
    return this.prisma.order.update({ where: { id }, data: { status: nextStatus } });
  }

  /** RF-18 (implícito): cancelar un pedido restaura el stock reservado. */
  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new NotFoundException(`Pedido ${id} no encontrado`);
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new BadRequestException(`No se puede cancelar un pedido en estado '${order.status}'`);
      }

      for (const item of order.items) {
        await this.inventoryService.applyMovement(tx, {
          productVariantId: item.productVariantId,
          type: InventoryMovementType.DEVOLUCION_ENTRADA,
          quantity: item.quantity,
          orderId: order.id,
          reason: 'Cancelación de pedido',
        });
      }

      return tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELADO } });
    });
  }

  private async resolveCustomerId(dto: CreateOrderDto, user: AuthenticatedUser | undefined): Promise<string> {
    if (user?.actorType === 'customer') return user.id;
    const guest = await this.customersService.findOrCreateGuestByEmail(
      dto.contactEmail,
      dto.contactName,
      dto.contactPhone,
    );
    return guest.id;
  }

  private async assertExists(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return order;
  }
}
