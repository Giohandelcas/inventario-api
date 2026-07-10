import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public, RequirePermission } from '../auth/decorators/roles.decorator';
import { can } from '../auth/permissions.matrix';
import { actorOf, type AuthenticatedUser } from '../auth/types';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

function includeCostFor(user: AuthenticatedUser | undefined) {
  return can(actorOf(user), 'productCost', 'read');
}

// RF-01/RF-02/RF-14/RF-15. Lectura pública para el catálogo; escritura solo ADMIN.
// El campo `cost` se oculta según la matriz de permisos (sección 9) salvo ADMIN/BODEGA.
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  findAll(@Query() query: QueryProductsDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.productsService.findAll(query, includeCostFor(user));
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.productsService.findOne(id, includeCostFor(user));
  }

  @Post()
  @RequirePermission('product', 'create')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('product', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user?: AuthenticatedUser) {
    const performedById = user?.actorType === 'internal' ? user.id : undefined;
    return this.productsService.update(id, dto, performedById);
  }

  @Delete(':id')
  @RequirePermission('product', 'delete')
  remove(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }

  @Post(':id/images')
  @RequirePermission('product', 'update')
  addImage(@Param('id') id: string, @Body() dto: CreateProductImageDto) {
    return this.productsService.addImage(id, dto);
  }

  @Delete(':id/images/:imageId')
  @RequirePermission('product', 'update')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }

  @Post(':id/variants')
  @RequirePermission('productVariant', 'create')
  addVariant(@Param('id') id: string, @Body() dto: CreateProductVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @Patch(':id/variants/:variantId')
  @RequirePermission('productVariant', 'update')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @RequirePermission('productVariant', 'delete')
  removeVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.productsService.deactivateVariant(id, variantId);
  }
}
