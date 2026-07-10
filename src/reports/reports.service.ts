import { Injectable } from '@nestjs/common';
import { InventoryMovementType, OrderStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriodQueryDto, SalesByPeriodQueryDto, TopProductsQueryDto } from './dto/report-period-query.dto';

// "Vendido" = pedidos que pasaron confirmación; excluye PENDIENTE (aún no
// confirmado) y CANCELADO.
const SOLD_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMADO,
  OrderStatus.PAGADO,
  OrderStatus.ENVIADO,
  OrderStatus.ENTREGADO,
];

function resolvePeriod(query: ReportPeriodQueryDto) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

// RF-11: reportes. ADMIN únicamente (matriz sección 9).
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async topProducts(query: TopProductsQueryDto) {
    const { from, to } = resolvePeriod(query);

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productVariantId'],
      where: { order: { status: { in: SOLD_STATUSES }, createdAt: { gte: from, lte: to } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: query.limit,
    });

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: grouped.map((g) => g.productVariantId) } },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return {
      period: { from, to },
      products: grouped.map((g) => {
        const variant = variantById.get(g.productVariantId);
        return {
          productVariantId: g.productVariantId,
          productId: variant?.product.id,
          productName: variant?.product.name,
          sku: variant?.sku,
          unitsSold: g._sum?.quantity ?? 0,
          revenue: g._sum?.subtotal ?? 0,
        };
      }),
    };
  }

  /** Valor total de inventario = Σ stock × costo, sobre variantes/productos activos. */
  async inventoryValue() {
    const result = await this.prisma.$queryRaw<{ totalvalue: string | null }[]>`
      SELECT SUM(pv.stock * p.cost) AS totalvalue
      FROM product_variants pv
      JOIN products p ON p.id = pv."productId"
      WHERE pv.active = true AND p.active = true
    `;
    return { totalValue: Number(result[0]?.totalvalue ?? 0) };
  }

  async salesByPeriod(query: SalesByPeriodQueryDto) {
    const { from, to } = resolvePeriod(query);

    const rows =
      query.groupBy === 'month'
        ? await this.prisma.$queryRaw<{ period: Date; totalsales: string; ordercount: bigint }[]>`
            SELECT date_trunc('month', "createdAt") AS period, SUM(total) AS totalsales, COUNT(*) AS ordercount
            FROM orders
            WHERE status != 'CANCELADO' AND "createdAt" BETWEEN ${from} AND ${to}
            GROUP BY period ORDER BY period ASC
          `
        : await this.prisma.$queryRaw<{ period: Date; totalsales: string; ordercount: bigint }[]>`
            SELECT date_trunc('day', "createdAt") AS period, SUM(total) AS totalsales, COUNT(*) AS ordercount
            FROM orders
            WHERE status != 'CANCELADO' AND "createdAt" BETWEEN ${from} AND ${to}
            GROUP BY period ORDER BY period ASC
          `;

    return {
      period: { from, to },
      groupBy: query.groupBy,
      sales: rows.map((r) => ({
        period: r.period,
        totalSales: Number(r.totalsales),
        orderCount: Number(r.ordercount),
      })),
    };
  }

  /**
   * Proxy simplificado de rotación: unidades vendidas en el período / stock
   * actual total. NO es una razón COGS/inventario-promedio formal — eso
   * requeriría snapshots periódicos de valor de inventario que v1 no
   * mantiene. Suficiente para una señal de "se mueve rápido / lento", no
   * para contabilidad financiera precisa.
   */
  async inventoryTurnover(query: ReportPeriodQueryDto) {
    const { from, to } = resolvePeriod(query);

    const [soldAgg, stockAgg] = await Promise.all([
      this.prisma.inventoryMovement.aggregate({
        where: { type: InventoryMovementType.VENTA_SALIDA, createdAt: { gte: from, lte: to } },
        _sum: { quantity: true },
      }),
      this.prisma.productVariant.aggregate({ where: { active: true }, _sum: { stock: true } }),
    ]);

    const unitsSold = soldAgg._sum.quantity ?? 0;
    const currentStock = stockAgg._sum.stock ?? 0;

    return {
      period: { from, to },
      unitsSold,
      currentStock,
      turnoverRatio: currentStock > 0 ? unitsSold / currentStock : null,
    };
  }
}
