import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// RF-09: gestionar usuarios internos con roles. Solo ADMIN (matriz sección 9).
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('internalUser', 'read')
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission('internalUser', 'read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermission('internalUser', 'create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('internalUser', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user?: AuthenticatedUser) {
    const performedById = user?.actorType === 'internal' ? user.id : undefined;
    return this.usersService.update(id, dto, performedById);
  }

  @Delete(':id')
  @RequirePermission('internalUser', 'delete')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
