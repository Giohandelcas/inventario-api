import type { Actor, InternalRole } from './permissions.matrix';

/**
 * Forma de `request.user`, poblada por JwtStrategy (strategies/jwt.strategy.ts)
 * a partir del payload firmado en AuthService.login(). RolesGuard y los
 * controllers dependen de esta forma. Hoy solo se emite la variante
 * `internal` (login de backoffice); `customer` queda para un futuro login
 * de clientes (RF-19, inventario-tienda).
 */
export type AuthenticatedUser =
  | { actorType: 'internal'; id: string; role: InternalRole }
  | { actorType: 'customer'; id: string };

export function actorOf(user: AuthenticatedUser | undefined): Actor {
  if (!user) return 'PUBLICO';
  return user.actorType === 'internal' ? user.role : 'CLIENTE';
}
