import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'slug único, ej. "ropa-hombre"' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug debe ser kebab-case (a-z0-9 y guiones)' })
  slug: string;

  @ApiPropertyOptional({ description: 'id de la categoría padre, para subcategorías (RF-06)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
