import { SetMetadata } from '@nestjs/common';
import type { Action, Resource } from '../permissions.matrix';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  resource: Resource;
  action: Action;
}

/**
 * Marca un endpoint con el resource+action que debe chequear RolesGuard
 * contra ../permissions.matrix.ts. No lista actores acá directamente para
 * no duplicar la matriz en cada controller — la matriz sigue siendo la
 * única fuente de verdad.
 */
export const RequirePermission = (resource: Resource, action: Action) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);

/** Marca un endpoint como accesible sin autenticación (catálogo público, etc). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
