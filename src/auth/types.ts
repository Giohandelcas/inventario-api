import type { Actor, InternalRole } from './permissions.matrix';

/**
 * Forma del `request.user` que un futuro JwtStrategy (Próximos Pasos #7 en
 * requerimientos.md) debe poblar. RolesGuard y los controllers dependen de
 * esta forma; no existe todavía ningún código que la produzca realmente.
 */
export type AuthenticatedUser =
  | { actorType: 'internal'; id: string; role: InternalRole }
  | { actorType: 'customer'; id: string };

export function actorOf(user: AuthenticatedUser | undefined): Actor {
  if (!user) return 'PUBLICO';
  return user.actorType === 'internal' ? user.role : 'CLIENTE';
}
