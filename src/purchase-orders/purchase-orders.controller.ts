import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

function requireInternalUser(user: AuthenticatedUser | undefined): asserts user is Extract<
  AuthenticatedUser,
  { actorType: 'internal' }
> {
  if (user?.actorType !== 'internal') {
    throw new ForbiddenException('Ruta exclusiva de personal interno');
  }
}

// RF-08. Matriz sección 9: ADMIN + BODEGA únicamente.
@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @RequirePermission('purchaseOrder', 'read')
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.purchaseOrdersService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission('purchaseOrder', 'read')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  @RequirePermission('purchaseOrder', 'create')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user?: AuthenticatedUser) {
    requireInternalUser(user);
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermission('purchaseOrder', 'update')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Post(':id/mark-ordered')
  @RequirePermission('purchaseOrder', 'update')
  markOrdered(@Param('id') id: string) {
    return this.purchaseOrdersService.markOrdered(id);
  }

  @Post(':id/cancel')
  @RequirePermission('purchaseOrder', 'update')
  cancel(@Param('id') id: string) {
    return this.purchaseOrdersService.cancel(id);
  }

  @Post(':id/receive')
  @RequirePermission('purchaseOrder', 'receivePurchaseOrder')
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    requireInternalUser(user);
    return this.purchaseOrdersService.receive(id, dto, user.id);
  }
}
