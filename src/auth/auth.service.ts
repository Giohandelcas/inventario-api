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

export interface CustomerJwtPayload {
  actorType: 'customer';
  id: string;
}

export type AuthJwtPayload = InternalJwtPayload | CustomerJwtPayload;

/**
 * Login de usuarios internos (Admin/Vendedor/Bodega, para `inventario-app`)
 * y de clientes (RF-19, para `inventario-tienda`). Un cliente creado solo
 * por checkout de invitado (`Customer.passwordHash` null, ver
 * ER-DIAGRAM.md) no puede loguearse hasta que registre una contraseña vía
 * POST /customers/register.
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

  async loginCustomer(email: string, password: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (!customer || !customer.active || !customer.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(
      password,
      customer.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: CustomerJwtPayload = {
      actorType: 'customer',
      id: customer.id,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      customer: { id: customer.id, name: customer.name, email: customer.email },
    };
  }
}
