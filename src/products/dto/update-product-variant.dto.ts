import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

// Tampoco acá: `stock` se muta únicamente vía InventoryMovement
// (POST /inventory/adjustments, recepción de compra, o checkout), nunca
// con un PATCH directo — así el saldo y el historial nunca divergen (RNF-01).
export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
