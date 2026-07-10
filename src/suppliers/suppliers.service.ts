import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { LinkProductDto } from './dto/link-product.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count(),
    ]);
    return paginatedResult(data, total, pagination);
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.assertExists(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  /** Soft-delete: PurchaseOrder.supplier es Restrict, un proveedor con historial de compras no puede borrarse. */
  async deactivate(id: string) {
    await this.assertExists(id);
    return this.prisma.supplier.update({ where: { id }, data: { active: false } });
  }

  async linkProduct(supplierId: string, dto: LinkProductDto) {
    await this.assertExists(supplierId);
    return this.prisma.productSupplier.upsert({
      where: { productId_supplierId: { productId: dto.productId, supplierId } },
      create: { supplierId, productId: dto.productId, supplierSku: dto.supplierSku, cost: dto.cost },
      update: { supplierSku: dto.supplierSku, cost: dto.cost },
    });
  }

  async unlinkProduct(supplierId: string, productId: string) {
    await this.assertExists(supplierId);
    return this.prisma.productSupplier.delete({
      where: { productId_supplierId: { productId, supplierId } },
    });
  }

  private async assertExists(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return supplier;
  }
}
