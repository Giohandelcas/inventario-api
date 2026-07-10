import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSION_KEY,
  type RequiredPermission,
} from '../decorators/roles.decorator';
import { can } from '../permissions.matrix';
import { actorOf, type AuthenticatedUser } from '../types';

/**
 * Aplica la matriz de permisos (../permissions.matrix.ts) a cada endpoint.
 *
 * Corre después de OptionalJwtAuthGuard (ver auth.module.ts), que puebla
 * `request.user` si vino un Bearer token válido de POST /auth/login. Si no
 * vino token (o es inválido/expiró), `request.user` queda `undefined` y
 * `actorOf()` lo resuelve como PUBLICO — sigue fallando cerrado por
 * defecto (RNF-02): cualquier endpoint marcado con @RequirePermission
 * rechaza la request salvo que el actor resuelto esté en la matriz.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) {
      // Ningún endpoint de backoffice/cliente debería quedar sin marcar.
      // Fail closed: si falta la anotación, se rechaza en vez de exponerlo.
      throw new ForbiddenException(
        'Endpoint sin @RequirePermission ni @Public declarado.',
      );
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const actor = actorOf(user);

    if (!can(actor, required.resource, required.action)) {
      throw new ForbiddenException(
        `Actor '${actor}' no tiene permiso para '${required.action}' sobre '${required.resource}'.`,
      );
    }
    return true;
  }
}
