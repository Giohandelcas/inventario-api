# Contratos de API

Todas las rutas están implementadas y compilan (`nest build` verde) y fueron probadas end-to-end contra una base de datos Postgres real (ver "Cómo se probó" al final). La documentación interactiva completa (Swagger/OpenAPI, RNF-07) se sirve en `GET /docs` cuando el servidor está corriendo.

Convenciones:
- **Actor** = quién puede llamar la ruta, tomado literalmente de la matriz de permisos en `../../inventario-app/requerimientos.md` sección 9. `PUBLICO` = sin autenticación.
- Todas las rutas de escritura validan el body con `class-validator` (RNF-03) vía `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` global.
- Los listados (`GET` de colección) aceptan `?page=&pageSize=` (RNF-06) y devuelven `{ data, meta: { page, pageSize, total, totalPages } }`.
- **Hoy no existe JWT real** (Próximos Pasos #7 en requerimientos.md): `RolesGuard` resuelve todo actor como `PUBLICO` mientras tanto, así que cualquier ruta que no sea explícitamente `PUBLICO`-permitida devuelve 403. Esto es intencional (fail-closed, RNF-02), no un bug.

## users — RF-09 (`src/users`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /users | ADMIN | `PaginationQueryDto` | nunca incluye `passwordHash` |
| GET /users/:id | ADMIN | — | 404 si no existe |
| POST /users | ADMIN | `CreateUserDto` (email, password, name, role) | 409 si el email ya existe |
| PATCH /users/:id | ADMIN | `UpdateUserDto` | si cambia `role`, dispara `AuditLog` (RF-12) |
| DELETE /users/:id | ADMIN | — | soft-delete (`active=false`), nunca hard-delete |

## customers — RF-19 (`src/customers`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| POST /customers/register | PUBLICO | `RegisterCustomerDto` | si el email ya existe como guest (sin password), completa esa fila en vez de duplicar |
| GET /customers/me | CLIENTE | — | 403 si no es actor `customer` |
| PATCH /customers/me | CLIENTE | `UpdateCustomerDto` | solo su propio registro |
| GET /customers | ADMIN, VENDEDOR | `PaginationQueryDto` | atención al cliente |
| GET /customers/:id | ADMIN, VENDEDOR | — | |

## categories — RF-06 (`src/categories`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /categories | PUBLICO | — | incluye `children` |
| GET /categories/:id | PUBLICO | — | incluye `parent` y `children` |
| POST /categories | ADMIN | `CreateCategoryDto` (name, slug, parentId?) | 409 si el slug ya existe |
| PATCH /categories/:id | ADMIN | `UpdateCategoryDto` | rechaza que una categoría sea su propio padre |
| DELETE /categories/:id | ADMIN | — | 409 si hay productos usando la categoría (`onDelete: Restrict`) |

## products — RF-01/RF-02/RF-14/RF-15 (`src/products`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /products | PUBLICO (+ADMIN/BODEGA con costo) | `QueryProductsDto` (categoryId?, search?, minPrice?, maxPrice?, paginación) | `cost` se omite salvo actor ADMIN/BODEGA — a nivel de campo, no de ruta |
| GET /products/:id | PUBLICO (+ADMIN/BODEGA con costo) | — | incluye `images`, `variants`, `category` |
| POST /products | ADMIN | `CreateProductDto` | |
| PATCH /products/:id | ADMIN | `UpdateProductDto` | si cambia `cost`/`basePrice`, dispara `AuditLog` (RF-12) |
| DELETE /products/:id | ADMIN | — | soft-delete |
| POST /products/:id/images | ADMIN | `CreateProductImageDto` | |
| DELETE /products/:id/images/:imageId | ADMIN | — | |
| POST /products/:id/variants | ADMIN | `CreateProductVariantDto` | variante nace con `stock=0`; cargar stock inicial vía `POST /inventory/adjustments` |
| PATCH /products/:id/variants/:variantId | ADMIN | `UpdateProductVariantDto` | nunca acepta `stock` — ver inventory |
| DELETE /products/:id/variants/:variantId | ADMIN | — | soft-delete |

## suppliers — RF-07 (`src/suppliers`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /suppliers | ADMIN, BODEGA | `PaginationQueryDto` | |
| GET /suppliers/:id | ADMIN, BODEGA | — | incluye productos asociados |
| POST /suppliers | ADMIN | `CreateSupplierDto` | |
| PATCH /suppliers/:id | ADMIN | `UpdateSupplierDto` | |
| DELETE /suppliers/:id | ADMIN | — | soft-delete |
| POST /suppliers/:id/products | ADMIN | `LinkProductDto` (productId, supplierSku?, cost?) | upsert de la asociación N:M |
| DELETE /suppliers/:id/products/:productId | ADMIN | — | |

## inventory — RF-03/RF-04/RF-05 (`src/inventory`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /inventory/movements | ADMIN, VENDEDOR, BODEGA | `QueryMovementsDto` (productVariantId?, paginación) | historial completo, append-only |
| POST /inventory/adjustments | ADMIN, BODEGA | `CreateAdjustmentDto` (productVariantId, type, quantity, reason?) | `type` restringido a `AJUSTE_ENTRADA\|AJUSTE_SALIDA\|DEVOLUCION_ENTRADA\|DEVOLUCION_SALIDA` — `COMPRA_ENTRADA`/`VENTA_SALIDA` son solo del sistema |
| GET /inventory/low-stock-alerts | ADMIN, BODEGA | — | variantes con `stock <= lowStockThreshold` |

`InventoryService.applyMovement()` es el único punto del sistema que muta `stock`, siempre en la misma transacción que el `InventoryMovement` (RNF-01). Las salidas usan un `UPDATE ... WHERE stock >= quantity` atómico — sin `SELECT FOR UPDATE`, sin aislamiento `Serializable`, la propia condición del `WHERE` impide que dos salidas concurrentes sobrevendan el mismo variant. Verificado con un test de concurrencia real (ver abajo).

## purchase-orders — RF-08 (`src/purchase-orders`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| GET /purchase-orders | ADMIN, BODEGA | `PaginationQueryDto` | |
| GET /purchase-orders/:id | ADMIN, BODEGA | — | incluye items y movimientos |
| POST /purchase-orders | ADMIN, BODEGA | `CreatePurchaseOrderDto` (supplierId, items[], expectedDate?, notes?) | nace en `BORRADOR` |
| PATCH /purchase-orders/:id | ADMIN, BODEGA | `UpdatePurchaseOrderDto` | solo si está en `BORRADOR` |
| POST /purchase-orders/:id/mark-ordered | ADMIN, BODEGA | — | `BORRADOR` → `ORDENADA` |
| POST /purchase-orders/:id/cancel | ADMIN, BODEGA | — | rechaza si ya está `RECIBIDA` |
| POST /purchase-orders/:id/receive | ADMIN, BODEGA | `ReceivePurchaseOrderDto` (items: [{purchaseOrderItemId, quantityReceived}]) | recepción total o parcial; incrementa stock + `InventoryMovement COMPRA_ENTRADA` por cada item, todo en una transacción; pasa a `RECIBIDA` o `PARCIALMENTE_RECIBIDA` según corresponda |

## orders — RF-10/RF-17/RF-18 (`src/orders`)

| Método y ruta | Actor | Body / Query | Notas |
|---|---|---|---|
| POST /orders | CLIENTE, PUBLICO | `CreateOrderDto` (items[], contactEmail, contactName, contactPhone?, shippingAddress?, notes?) | checkout invitado o con cuenta; decremento inmediato de stock (decisión documentada, sección 6); sin pago en línea (RF-17), nace en `PENDIENTE` |
| GET /orders | ADMIN, VENDEDOR, BODEGA (todos) / CLIENTE (propios) | `PaginationQueryDto` | filtro de "propios" aplicado en el service, no en la ruta |
| GET /orders/:id | ídem | — | 403 si un CLIENTE pide un pedido ajeno |
| POST /orders/:id/confirm | ADMIN, VENDEDOR | — | `PENDIENTE` → `CONFIRMADO` |
| POST /orders/:id/mark-paid | ADMIN, VENDEDOR | — | `CONFIRMADO` → `PAGADO` |
| POST /orders/:id/ship | ADMIN, BODEGA | — | `PAGADO` → `ENVIADO` |
| POST /orders/:id/deliver | ADMIN, BODEGA | — | `ENVIADO` → `ENTREGADO` |
| POST /orders/:id/cancel | ADMIN, VENDEDOR | — | solo desde `PENDIENTE\|CONFIRMADO\|PAGADO`; restaura stock vía `InventoryMovement DEVOLUCION_ENTRADA` por cada item |

Cada transición valida el estado actual contra el esperado (`PREVIOUS_STATUS` en `orders.service.ts`) — no se puede saltar pasos (ej. `PENDIENTE` → `ENVIADO` directo).

## reports — RF-11 (`src/reports`)

| Método y ruta | Actor | Query | Notas |
|---|---|---|---|
| GET /reports/top-products | ADMIN | `TopProductsQueryDto` (from?, to?, limit=10) | agrupa `OrderItem` por variante, excluye pedidos `PENDIENTE`/`CANCELADO` |
| GET /reports/inventory-value | ADMIN | — | `Σ stock × cost`, SQL crudo, variantes/productos activos |
| GET /reports/sales-by-period | ADMIN | `SalesByPeriodQueryDto` (from?, to?, groupBy=day\|month) | excluye pedidos `CANCELADO` |
| GET /reports/inventory-turnover | ADMIN | `ReportPeriodQueryDto` (from?, to?) | **simplificado**: unidades vendidas en el período ÷ stock actual total. No es una razón COGS/inventario-promedio formal — ver comentario en `reports.service.ts` |

## audit-logs — RF-12 (`src/audit`)

| Método y ruta | Actor | Query | Notas |
|---|---|---|---|
| GET /audit-logs | ADMIN | `QueryAuditLogsDto` (entityType?, entityId?, paginación) | sin endpoint de escritura manual — cada fila la genera el service que hace el cambio auditado |

**Alcance actual de RF-12**: el movimiento de stock ya lo audita `InventoryMovement` (RF-04) — no se duplica en `AuditLog`. `AuditLog` cubre, por ahora, cambios de rol de usuario (`UsersService.update`) y cambios de precio/costo de producto (`ProductsService.update`). Extenderlo a otras entidades sensibles (ej. cambios en `Supplier`, eliminación de `Category`) es un follow-up, no algo ya cubierto — no asumir que todo está auditado.

## Qué falta para que esto sirva en producción

1. **JWT real** (Próximos Pasos #7): hoy `RolesGuard` resuelve todo actor como `PUBLICO`. Falta `JwtStrategy` + `JwtAuthGuard` que pueble `request.user` con la forma de `AuthenticatedUser` (`src/auth/types.ts`) a partir del token.
2. **Notificaciones** (RF-20, RF-23): no hay módulo de email ni de notificaciones internas. Los endpoints de cambio de estado de pedido no notifican a nadie todavía.
3. **Base de datos persistente**: las pruebas de este documento corrieron contra un Postgres local efímero (`npx prisma dev`, ver abajo) — para producción hace falta Railway/Render/Fly.io (sección 5 de requerimientos.md) y correr `prisma migrate dev` (no solo `db push`) para tener historial de migraciones real.
4. **Rate limiting / throttling** en rutas públicas de escritura (`POST /orders`, `POST /customers/register`) — no implementado, no estaba en el alcance de RF/RNF pero es una omisión típica antes de exponer a internet.

## Cómo se probó

- `npx tsc --noEmit` y `nest build` limpios sobre todo el código de este documento.
- Servidor arrancado real (`node dist/src/main.js`) contra un Postgres local (`npx prisma dev`), con el schema aplicado vía `prisma db push`.
- `GET /categories`, `GET /products` verificados con `curl` contra el servidor real.
- `POST /categories` sin autenticación verificado que devuelve 403 (RolesGuard fail-closed).
- Flujo completo ejecutado directamente contra los services reales (bypaseando HTTP, ya que hoy todo actor no-público da 403 sin JWT): crear categoría/producto/variante → ajuste manual de stock → checkout de invitado → **dos checkouts concurrentes sobre stock insuficiente, confirmando que uno se rechaza limpio y el stock nunca queda negativo** → orden de compra completa (crear → ordenar → recibir) → cancelación de pedido con restitución de stock. Todos los resultados fueron los esperados.
