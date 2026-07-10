/**
 * Fuente de verdad en código de la matriz de permisos.
 * Espejo de la sección 9 ("Matriz de Permisos por Rol") en
 * ../../../inventario-app/requerimientos.md — si cambia una, cambia la otra.
 *
 * Esta matriz solo captura reglas resource+action -> actores permitidos.
 * NO captura restricciones de "propio" (ej. un Cliente solo puede leer sus
 * propios pedidos) ni restricciones de campo (ej. Vendedor lee Product pero
 * sin el campo cost) — esas se aplican en el service/resolver usando el
 * id del actor autenticado, no aquí. Ver `productCost` como resource aparte
 * para el caso de campo sensible.
 */
import { Role } from '../../generated/prisma/enums';

export type InternalRole = (typeof Role)[keyof typeof Role];

/** Todo actor posible: rol interno, cliente autenticado/invitado, o público sin sesión. */
export type Actor = InternalRole | 'CLIENTE' | 'PUBLICO';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'receivePurchaseOrder'
  | 'adjustStock'
  | 'changeStatusSales' // Order: pendiente -> confirmado -> pagado
  | 'changeStatusLogistics' // Order: pagado -> enviado -> entregado
  | 'cancel';

export type Resource =
  | 'internalUser'
  | 'customer'
  | 'category'
  | 'product'
  | 'productCost'
  | 'productVariant'
  | 'lowStockAlert'
  | 'inventoryMovement'
  | 'supplier'
  | 'purchaseOrder'
  | 'order'
  | 'report'
  | 'auditLog';

type ResourcePermissions = Partial<Record<Action, readonly Actor[]>>;

export const PERMISSIONS_MATRIX: Record<Resource, ResourcePermissions> = {
  internalUser: {
    create: ['ADMIN'],
    read: ['ADMIN'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
  },
  // "read"/"update" propio se resuelve en el service comparando el id del
  // actor con el customerId del recurso; aquí solo se listan los actores que
  // pueden llegar a acceder a la ruta en absoluto.
  customer: {
    create: ['PUBLICO', 'CLIENTE'],
    read: ['ADMIN', 'VENDEDOR', 'CLIENTE'],
    update: ['ADMIN', 'CLIENTE'],
    delete: ['ADMIN'],
  },
  category: {
    create: ['ADMIN'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
    read: ['ADMIN', 'VENDEDOR', 'BODEGA', 'CLIENTE', 'PUBLICO'],
  },
  // Ver sin costo. El campo `cost` se omite en la respuesta salvo que el
  // actor también tenga acceso a `productCost` (ver abajo).
  product: {
    create: ['ADMIN'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
    read: ['ADMIN', 'VENDEDOR', 'BODEGA', 'CLIENTE', 'PUBLICO'],
  },
  productCost: {
    read: ['ADMIN', 'BODEGA'],
  },
  productVariant: {
    create: ['ADMIN'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
    read: ['ADMIN', 'VENDEDOR', 'BODEGA', 'CLIENTE', 'PUBLICO'],
  },
  lowStockAlert: {
    read: ['ADMIN', 'BODEGA'],
  },
  // "create" cubre ajustes manuales, devoluciones y recepción de compra.
  // El movimiento VENTA_SALIDA se genera automáticamente al confirmar un
  // Order, nunca vía un endpoint directo — por eso no hay actor listado
  // para ese caso, no se expone como acción de esta matriz.
  inventoryMovement: {
    create: ['ADMIN', 'BODEGA'],
    read: ['ADMIN', 'VENDEDOR', 'BODEGA'],
  },
  supplier: {
    create: ['ADMIN'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
    read: ['ADMIN', 'BODEGA'],
  },
  purchaseOrder: {
    create: ['ADMIN', 'BODEGA'],
    update: ['ADMIN', 'BODEGA'],
    receivePurchaseOrder: ['ADMIN', 'BODEGA'],
    read: ['ADMIN', 'BODEGA'],
  },
  // "read" propio se resuelve en el service (Cliente ve solo sus Order).
  order: {
    create: ['CLIENTE', 'PUBLICO'],
    read: ['ADMIN', 'VENDEDOR', 'BODEGA', 'CLIENTE'],
    changeStatusSales: ['ADMIN', 'VENDEDOR'],
    changeStatusLogistics: ['ADMIN', 'BODEGA'],
    cancel: ['ADMIN', 'VENDEDOR'],
  },
  report: {
    read: ['ADMIN'],
  },
  auditLog: {
    read: ['ADMIN'],
  },
};

/**
 * Chequeo puro resource+action -> actor permitido. No sabe nada de "propio"
 * ni de campos — eso lo aplica el caller (guard/service) con el id real.
 */
export function can(actor: Actor, resource: Resource, action: Action): boolean {
  return PERMISSIONS_MATRIX[resource][action]?.includes(actor) ?? false;
}
