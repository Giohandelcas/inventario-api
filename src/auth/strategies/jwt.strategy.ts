import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthJwtPayload } from '../auth.service';
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

  /** El valor de retorno se convierte en `request.user` (ver OptionalJwtAuthGuard y RolesGuard). */
  validate(payload: AuthJwtPayload): AuthenticatedUser {
    if (payload.actorType === 'internal') {
      return { actorType: 'internal', id: payload.id, role: payload.role };
    }
    return { actorType: 'customer', id: payload.id };
  }
}
