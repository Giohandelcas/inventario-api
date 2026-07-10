import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { InternalJwtPayload } from '../auth.service';
import type { AuthenticatedUser } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * El valor de retorno se convierte en `request.user` (ver
   * OptionalJwtAuthGuard y RolesGuard). Hoy solo emitimos tokens de actor
   * `internal` (login de backoffice, ver AuthService); un futuro login de
   * clientes (RF-19) sumaría `actorType: 'customer'` acá.
   */
  validate(payload: InternalJwtPayload): AuthenticatedUser {
    return { actorType: payload.actorType, id: payload.id, role: payload.role };
  }
}
