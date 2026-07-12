import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public, RequirePermission } from '../auth/decorators/roles.decorator';
import { LoginDto } from '../auth/dto/login.dto';
import type { AuthenticatedUser } from '../auth/types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CustomersService } from './customers.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// RF-19: registro/login de cliente (opcional en v1). Matriz sección 9: "customer".
@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @Public()
  register(@Body() dto: RegisterCustomerDto) {
    return this.customersService.register(dto);
  }

  /** Un Customer creado solo por checkout de invitado (sin passwordHash) no puede loguearse todavía. */
  @Post('login')
  @Public()
  login(@Body() dto: LoginDto) {
    return this.authService.loginCustomer(dto.email, dto.password);
  }

  @Get('me')
  @RequirePermission('customer', 'read')
  findMe(@CurrentUser() user?: AuthenticatedUser) {
    if (user?.actorType !== 'customer') {
      throw new ForbiddenException('Ruta exclusiva de clientes autenticados');
    }
    return this.customersService.findOne(user.id);
  }

  @Patch('me')
  @RequirePermission('customer', 'update')
  updateMe(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateCustomerDto,
  ) {
    if (user?.actorType !== 'customer') {
      throw new ForbiddenException('Ruta exclusiva de clientes autenticados');
    }
    return this.customersService.updateSelf(user.id, dto);
  }

  // Listado/detalle para atención al cliente (ADMIN, VENDEDOR — matriz sección 9).
  @Get()
  @RequirePermission('customer', 'read')
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.customersService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission('customer', 'read')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
