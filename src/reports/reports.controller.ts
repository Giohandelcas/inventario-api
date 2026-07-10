import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import { ReportPeriodQueryDto, SalesByPeriodQueryDto, TopProductsQueryDto } from './dto/report-period-query.dto';
import { ReportsService } from './reports.service';

// RF-11. Matriz sección 9: ADMIN únicamente.
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('top-products')
  @RequirePermission('report', 'read')
  topProducts(@Query() query: TopProductsQueryDto) {
    return this.reportsService.topProducts(query);
  }

  @Get('inventory-value')
  @RequirePermission('report', 'read')
  inventoryValue() {
    return this.reportsService.inventoryValue();
  }

  @Get('sales-by-period')
  @RequirePermission('report', 'read')
  salesByPeriod(@Query() query: SalesByPeriodQueryDto) {
    return this.reportsService.salesByPeriod(query);
  }

  @Get('inventory-turnover')
  @RequirePermission('report', 'read')
  inventoryTurnover(@Query() query: ReportPeriodQueryDto) {
    return this.reportsService.inventoryTurnover(query);
  }
}
