import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { LinkProductDto } from './dto/link-product.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

// RF-07. Matriz sección 9: ADMIN (todo) + BODEGA (solo lectura).
@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission('supplier', 'read')
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.suppliersService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission('supplier', 'read')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermission('supplier', 'create')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('supplier', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('supplier', 'delete')
  remove(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }

  @Post(':id/products')
  @RequirePermission('supplier', 'update')
  linkProduct(@Param('id') id: string, @Body() dto: LinkProductDto) {
    return this.suppliersService.linkProduct(id, dto);
  }

  @Delete(':id/products/:productId')
  @RequirePermission('supplier', 'update')
  unlinkProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.suppliersService.unlinkProduct(id, productId);
  }
}
