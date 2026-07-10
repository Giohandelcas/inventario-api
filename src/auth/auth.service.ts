import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { InternalRole } from './permissions.matrix';

export interface InternalJwtPayload {
  actorType: 'internal';
  id: string;
  role: InternalRole;
}

/**
 * Login de usuarios internos (Admin/Vendedor/Bodega) para el backoffice
 * (`inventario-app`). El login de clientes (RF-19, storefront) es un
 * follow-up separado: `Customer.passwordHash` es nullable porque el
 * checkout de invitado no lo necesita (ver ER-DIAGRAM.md).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: InternalJwtPayload = {
      actorType: 'internal',
      id: user.id,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}
