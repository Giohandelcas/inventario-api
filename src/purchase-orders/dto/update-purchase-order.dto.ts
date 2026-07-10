import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

// Solo campos editables mientras la orden está en BORRADOR — los items no se
// editan acá (agregar/quitar items de una orden ya creada es un caso de uso
// que no está en el alcance de v1; se cancela y se crea una nueva).
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
