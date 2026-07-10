# Diagrama Entidad-Relación

Generado a partir de [`schema.prisma`](./schema.prisma). Ver `../../inventario-app/requerimientos.md` para el detalle de requerimientos (RF-XX) que motivan cada entidad.

```mermaid
erDiagram
    User ||--o{ PurchaseOrder : "ordenó"
    User ||--o{ InventoryMovement : "realizó"
    User ||--o{ AuditLog : "generó"

    Customer ||--o{ Order : "realiza"

    Category ||--o{ Category : "subcategoría de"
    Category ||--o{ Product : "clasifica"

    Product ||--o{ ProductImage : "tiene"
    Product ||--o{ ProductVariant : "tiene"
    Product ||--o{ ProductSupplier : "asociado a"

    Supplier ||--o{ ProductSupplier : "provee"
    Supplier ||--o{ PurchaseOrder : "recibe"

    PurchaseOrder ||--o{ PurchaseOrderItem : "contiene"
    PurchaseOrder ||--o{ InventoryMovement : "genera"
    ProductVariant ||--o{ PurchaseOrderItem : "referenciada en"

    ProductVariant ||--o{ InventoryMovement : "afecta"
    ProductVariant ||--o{ OrderItem : "referenciada en"

    Order ||--o{ OrderItem : "contiene"
    Order ||--o{ InventoryMovement : "genera"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        Role role
        boolean active
    }

    Customer {
        string id PK
        string email UK
        string passwordHash "nullable - guest checkout"
        string name
        string phone
    }

    Category {
        string id PK
        string name
        string slug UK
        string parentId FK "self-relation"
    }

    Product {
        string id PK
        string sku UK
        string name
        string categoryId FK
        decimal cost
        decimal basePrice
    }

    ProductImage {
        string id PK
        string productId FK
        string url
        int position
    }

    ProductVariant {
        string id PK
        string productId FK
        string sku UK
        json attributes "talla, color, presentación..."
        decimal priceOverride "nullable"
        int stock "fuente de verdad, RNF-01"
        int lowStockThreshold "RF-05"
    }

    Supplier {
        string id PK
        string name
        string contactName
        string email
        string phone
    }

    ProductSupplier {
        string productId PK_FK
        string supplierId PK_FK
        string supplierSku
        decimal cost
    }

    PurchaseOrder {
        string id PK
        string supplierId FK
        string orderedById FK
        PurchaseOrderStatus status
        datetime orderDate
        datetime expectedDate
    }

    PurchaseOrderItem {
        string id PK
        string purchaseOrderId FK
        string productVariantId FK
        int quantityOrdered
        int quantityReceived
        decimal unitCost
    }

    InventoryMovement {
        string id PK
        string productVariantId FK
        InventoryMovementType type
        int quantity "siempre positivo, el signo lo da type"
        string purchaseOrderId FK "nullable"
        string orderId FK "nullable"
        string performedById FK "nullable"
    }

    Order {
        string id PK
        string customerId FK
        OrderStatus status
        decimal subtotal
        decimal total
        string contactEmail
        json shippingAddress
    }

    OrderItem {
        string id PK
        string orderId FK
        string productVariantId FK
        int quantity
        decimal unitPrice
        decimal subtotal
    }

    AuditLog {
        string id PK
        string userId FK "nullable"
        string entityType "polimórfico: nombre del modelo auditado"
        string entityId "polimórfico: id de la fila auditada"
        AuditAction action
        json changes
    }
```

## Decisiones de diseño

- **`ProductVariant.stock` es el campo fuente de verdad**, no una suma calculada de `InventoryMovement` en cada lectura (por performance en listados/catálogo, RNF-06). Se actualiza siempre dentro de la misma transacción de BD que inserta la fila de `InventoryMovement` correspondiente (RNF-01), nunca de forma aislada — así el saldo y el historial nunca divergen.
- **`InventoryMovement` es append-only**: nunca se edita ni se borra una fila existente; para corregir un movimiento se inserta un nuevo movimiento de ajuste (`AJUSTE_ENTRADA`/`AJUSTE_SALIDA`). Esto es lo que hace confiable el historial de RF-04 y la auditoría de RF-12.
- **`Customer.passwordHash` es nullable** para soportar guest checkout (RF-17/RF-19): un pedido siempre requiere un `Customer`, pero éste puede crearse solo con email/nombre/teléfono en el momento del checkout, sin cuenta. Si el cliente decide registrarse después, se completa `passwordHash` sobre el mismo registro (buscado por email).
- **`AuditLog` usa `entityType` + `entityId` genéricos** en vez de una FK por cada tipo de entidad auditable, para no tener que tocar el schema cada vez que se decide auditar una tabla nueva.
- **`Category` es auto-referencial** (`parentId`) para soportar subcategorías (RF-06) con un solo nivel de anidamiento adicional en v1 (no se modeló un árbol arbitrariamente profundo porque el documento de requerimientos no lo pide).
- **Decimal, no Float**, para todos los montos de dinero (`cost`, `basePrice`, `unitCost`, `unitPrice`, `subtotal`, `total`) — evita errores de redondeo en cálculos financieros.
- **RF-18 resuelto: decremento inmediato de stock**, no reserva con expiración. Al confirmar un pedido, `ProductVariant.stock` se decrementa dentro de la misma transacción que crea el `Order`, sus `OrderItem` y el `InventoryMovement` (`VENTA_SALIDA`) — sin estado intermedio de "reservado" ni tabla de reservas con TTL. Si dos clientes compiten por el mismo `ProductVariant`, la transacción debe leer el `stock` con lock (`SELECT ... FOR UPDATE` o nivel de aislamiento `Serializable`) y rechazar la venta si no alcanza, para cumplir RNF-01 y evitar sobreventa.

## Pendiente de definir (fuera de este modelo)

- Reglas exactas de permisos por rol y por endpoint (Próximos Pasos #4 en `requerimientos.md`) — este schema define **quién puede existir** (roles), no **qué puede hacer cada rol**.
