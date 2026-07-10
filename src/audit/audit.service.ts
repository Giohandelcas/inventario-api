import { Injectable } from '@nestjs/common';
import { AuditAction, type Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginatedResult } from '../common/dto/pagination-query.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

/**
 * RF-12: "quién y cuándo modificó stock, precios, etc." El movimiento de
 * stock YA queda auditado por InventoryMovement (RF-04) — no se duplica
 * acá. AuditLog cubre lo que InventoryMovement no cubre: cambios de
 * precio/costo y cambios de rol de usuario, por ahora (ver nota en
 * requerimientos.md sobre alcance de esta primera pasada).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: {
    userId?: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    changes?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findAll(query: QueryAuditLogsDto) {
    const where = {
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
    };
    const pagination: PaginationQueryDto = query;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }
}
