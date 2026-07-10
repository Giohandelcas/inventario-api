import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

// No incluye `stock`: una variante nueva siempre arranca en 0. Cualquier
// stock inicial se carga después con POST /inventory/adjustments, para que
// incluso el primer stock quede en el historial de InventoryMovement (RF-04).
export class CreateProductVariantDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Atributos libres de la variante (talla, color, presentación...)',
    example: { talla: 'M', color: 'azul' },
  })
  @IsObject()
  attributes: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Precio específico de la variante, si difiere del basePrice del producto' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ default: 0, description: 'Umbral para alerta de stock bajo (RF-05)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
