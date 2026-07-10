import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReportPeriodQueryDto {
  @ApiPropertyOptional({ description: 'ISO date, default: hace 30 días' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date, default: hoy' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TopProductsQueryDto extends ReportPeriodQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

export class SalesByPeriodQueryDto extends ReportPeriodQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'month'], default: 'day' })
  @IsOptional()
  @IsIn(['day', 'month'])
  groupBy: 'day' | 'month' = 'day';
}
