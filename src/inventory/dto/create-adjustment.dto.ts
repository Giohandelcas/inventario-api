import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { InventoryMovementType } from '../../../generated/prisma/enums';

// Solo los tipos que se disparan manualmente. COMPRA_ENTRADA la genera
// PurchaseOrdersService al recibir mercancía; VENTA_SALIDA la genera
// OrdersService al confirmar un pedido — ninguna de las dos se crea aquí.
export const ADJUSTABLE_MOVEMENT_TYPES = [
  InventoryMovementType.AJUSTE_ENTRADA,
  InventoryMovementType.AJUSTE_SALIDA,
  InventoryMovementType.DEVOLUCION_ENTRADA,
  InventoryMovementType.DEVOLUCION_SALIDA,
] as const;

export class CreateAdjustmentDto {
  @ApiProperty()
  @IsString()
  productVariantId: string;

  @ApiProperty({ enum: ADJUSTABLE_MOVEMENT_TYPES })
  @IsIn(ADJUSTABLE_MOVEMENT_TYPES, {
    message: `type debe ser uno de: ${ADJUSTABLE_MOVEMENT_TYPES.join(', ')}`,
  })
  type: (typeof ADJUSTABLE_MOVEMENT_TYPES)[number];

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
