import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditAction } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

// nunca devolver passwordHash en una respuesta HTTP.
function toPublicUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(pagination: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return paginatedResult(data.map(toPublicUser), total, pagination);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return toPublicUser(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException(`Ya existe un usuario con email ${dto.email}`);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, role: dto.role, passwordHash },
    });
    return toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto, performedById?: string) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundException(`Usuario ${id} no encontrado`);

    const user = await this.prisma.user.update({ where: { id }, data: dto });

    // RF-12: el rol es información sensible de permisos, se audita aparte del stock.
    if (dto.role && dto.role !== before.role) {
      await this.auditService.log({
        userId: performedById,
        entityType: 'User',
        entityId: id,
        action: AuditAction.UPDATE,
        changes: { role: { from: before.role, to: dto.role } },
      });
    }

    return toPublicUser(user);
  }

  /** No hay hard-delete: un User referenciado por PurchaseOrder/InventoryMovement/AuditLog no puede borrarse sin perder el rastro de auditoría. Se desactiva. */
  async deactivate(id: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({ where: { id }, data: { active: false } });
    return toPublicUser(user);
  }
}
