import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const SALT_ROUNDS = 10;

function toPublicCustomer<T extends { passwordHash: string | null }>(customer: T) {
  const { passwordHash: _passwordHash, ...rest } = customer;
  return rest;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);
    return paginatedResult(data.map(toPublicCustomer), total, pagination);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return toPublicCustomer(customer);
  }

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing?.passwordHash) {
      throw new ConflictException(`Ya existe una cuenta con email ${dto.email}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Si ya existía como guest (de un checkout previo sin cuenta), se completa
    // esa fila en vez de crear un Customer duplicado — ver ER-DIAGRAM.md.
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: { passwordHash, name: dto.name, phone: dto.phone },
        })
      : await this.prisma.customer.create({
          data: { email: dto.email, passwordHash, name: dto.name, phone: dto.phone },
        });

    return toPublicCustomer(customer);
  }

  async updateSelf(customerId: string, dto: UpdateCustomerDto) {
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, SALT_ROUNDS) : undefined;
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { name: dto.name, phone: dto.phone, ...(passwordHash && { passwordHash }) },
    });
    return toPublicCustomer(customer);
  }

  /**
   * Usado por OrdersService en el checkout de invitado (RF-17/RF-19): crea o
   * reutiliza un Customer por email sin credenciales. Nunca pisa un
   * passwordHash existente si el email ya tiene cuenta registrada.
   */
  async findOrCreateGuestByEmail(email: string, name: string, phone?: string) {
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) return existing;
    return this.prisma.customer.create({ data: { email, name, phone } });
  }
}
