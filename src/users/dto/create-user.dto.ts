import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}
