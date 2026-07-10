import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { paginatedResult } from '../common/dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

const PRODUCT_INCLUDE = { images: true, variants: true, category: true } satisfies Prisma.ProductInclude;

// RF-01 pide costo en el modelo, pero la matriz de permisos (sección 9)
// dice que solo ADMIN/BODEGA lo ven — el campo se quita acá, en el borde de
// serialización, no en la query, para no tener dos rutas de lectura distintas.
function serializeProduct<T extends { cost: Prisma.Decimal }>(product: T, includeCost: boolean) {
  if (includeCost) return product;
  const { cost: _cost, ...rest } = product;
  return rest;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryProductsDto, includeCost: boolean) {
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        basePrice: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: query.skip,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginatedResult(
      data.map((p) => serializeProduct(p, includeCost)),
      total,
      query,
    );
  }

  async findOne(id: string, includeCost: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return serializeProduct(product, includeCost);
  }

  private async assertExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  // create/update siempre devuelven con costo: solo ADMIN llega a estos métodos (matriz sección 9).
  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto, include: PRODUCT_INCLUDE });
  }

  async update(id: string, dto: UpdateProductDto, performedById?: string) {
    const before = await this.assertExists(id);
    const product = await this.prisma.product.update({ where: { id }, data: dto, include: PRODUCT_INCLUDE });

    // RF-12: precio/costo son sensibles, se auditan aparte del stock (que ya audita InventoryMovement).
    const costChanged = dto.cost !== undefined && Number(before.cost) !== dto.cost;
    const priceChanged = dto.basePrice !== undefined && Number(before.basePrice) !== dto.basePrice;
    if (costChanged || priceChanged) {
      await this.auditService.log({
        userId: performedById,
        entityType: 'Product',
        entityId: id,
        action: AuditAction.UPDATE,
        changes: {
          ...(costChanged && { cost: { from: before.cost, to: dto.cost } }),
          ...(priceChanged && { basePrice: { from: before.basePrice, to: dto.basePrice } }),
        },
      });
    }

    return product;
  }

  /** Soft-delete: un hard delete rompería el historial de OrderItem/PurchaseOrderItem de sus variantes. */
  async deactivate(id: string) {
    await this.assertExists(id);
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }

  async addImage(productId: string, dto: CreateProductImageDto) {
    await this.assertExists(productId);
    return this.prisma.productImage.create({ data: { ...dto, productId } });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(`Imagen ${imageId} no encontrada en producto ${productId}`);
    }
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async addVariant(productId: string, dto: CreateProductVariantDto) {
    await this.assertExists(productId);
    return this.prisma.productVariant.create({
      data: { ...dto, productId, attributes: dto.attributes as Prisma.InputJsonValue },
    });
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateProductVariantDto) {
    await this.assertVariantBelongsToProduct(productId, variantId);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { ...dto, attributes: dto.attributes as Prisma.InputJsonValue | undefined },
    });
  }

  /** Soft-delete, mismo motivo que el producto: la variante puede tener InventoryMovement/OrderItem asociados. */
  async deactivateVariant(productId: string, variantId: string) {
    await this.assertVariantBelongsToProduct(productId, variantId);
    return this.prisma.productVariant.update({ where: { id: variantId }, data: { active: false } });
  }

  private async assertVariantBelongsToProduct(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException(`Variante ${variantId} no encontrada en producto ${productId}`);
    }
    return variant;
  }
}
