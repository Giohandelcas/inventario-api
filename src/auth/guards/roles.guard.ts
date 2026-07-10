import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSION_KEY, type RequiredPermission } from '../decorators/roles.decorator';
import { can } from '../permissions.matrix';
import { actorOf, type AuthenticatedUser } from '../types';

/**
 * Aplica la matriz de permisos (../permissions.matrix.ts) a cada endpoint.
 *
 * IMPORTANTE: hoy no existe ningún JwtStrategy que popule `request.user`
 * (ver Próximos Pasos #7 en requerimientos.md), así que todo actor se
 * resuelve como PUBLICO. Este guard falla cerrado a propósito: cualquier
 * endpoint marcado con @RequirePermission (es decir, cualquiera que no sea
 * explícitamente @Public()) rechaza la request mientras no haya JWT real.
 * Es el comportamiento correcto para RNF-02 — "protegido" por defecto es
 * más seguro que "abierto por accidente" mientras se construye el módulo
 * de auth.
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

    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      // Ningún endpoint de backoffice/cliente debería quedar sin marcar.
      // Fail closed: si falta la anotación, se rechaza en vez de exponerlo.
      throw new ForbiddenException('Endpoint sin @RequirePermission ni @Public declarado.');
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
