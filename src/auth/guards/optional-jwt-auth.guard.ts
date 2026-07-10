import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Corre antes que RolesGuard (ver auth.module.ts, orden de APP_GUARD) y
 * puebla `request.user` si viene un Bearer token válido. A diferencia del
 * `AuthGuard('jwt')` de Passport por defecto, nunca rechaza la request por
 * token ausente/inválido — eso dejaría sin funcionar cualquier ruta
 * `@Public()`. La decisión de qué actor puede hacer qué la sigue tomando
 * RolesGuard contra `request.user` (o `undefined` → PUBLICO).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user || undefined;
  }
}
