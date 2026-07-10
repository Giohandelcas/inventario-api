import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsPositive, IsString, ValidateNested } from 'class-validator';

export class ReceivePurchaseOrderItemDto {
  @ApiProperty()
  @IsString()
  purchaseOrderItemId: string;

  @ApiProperty({ description: 'Cantidad recibida en esta recepción (puede ser parcial)' })
  @IsInt()
  @IsPositive()
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];
}
