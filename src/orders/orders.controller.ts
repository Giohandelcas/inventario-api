import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

// RF-10/RF-17/RF-18. Matriz sección 9: create → CLIENTE+PUBLICO (checkout de
// invitado); lectura própia CLIENTE, lectura total ADMIN/VENDEDOR/BODEGA;
// transiciones de venta ADMIN/VENDEDOR, logísticas ADMIN/BODEGA.
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermission('order', 'create')
  checkout(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.ordersService.checkout(dto, user);
  }

  @Get()
  @RequirePermission('order', 'read')
  findAll(@Query() pagination: PaginationQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.ordersService.findAll(pagination, user);
  }

  @Get(':id')
  @RequirePermission('order', 'read')
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.ordersService.findOne(id, user);
  }

  @Post(':id/confirm')
  @RequirePermission('order', 'changeStatusSales')
  confirm(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, 'confirm');
  }

  @Post(':id/mark-paid')
  @RequirePermission('order', 'changeStatusSales')
  markPaid(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, 'markPaid');
  }

  @Post(':id/ship')
  @RequirePermission('order', 'changeStatusLogistics')
  ship(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, 'ship');
  }

  @Post(':id/deliver')
  @RequirePermission('order', 'changeStatusLogistics')
  deliver(@Param('id') id: string) {
    return this.ordersService.transitionStatus(id, 'deliver');
  }

  @Post(':id/cancel')
  @RequirePermission('order', 'cancel')
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }
}
