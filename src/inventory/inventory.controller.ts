import { Body, Controller, ForbiddenException, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { InventoryService } from './inventory.service';

// RF-03/04/05. Matriz sección 9: crear ajustes ADMIN+BODEGA, leer también VENDEDOR.
@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
  @RequirePermission('inventoryMovement', 'read')
  findMovements(@Query() query: QueryMovementsDto) {
    return this.inventoryService.findMovements(query, query.productVariantId);
  }

  @Post('adjustments')
  @RequirePermission('inventoryMovement', 'create')
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user?: AuthenticatedUser) {
    if (user?.actorType !== 'internal') {
      throw new ForbiddenException('Ruta exclusiva de personal interno');
    }
    return this.inventoryService.createAdjustment(dto, user.id);
  }

  @Get('low-stock-alerts')
  @RequirePermission('lowStockAlert', 'read')
  findLowStockAlerts() {
    return this.inventoryService.findLowStockAlerts();
  }
}
