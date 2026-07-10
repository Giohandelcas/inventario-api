# Graph Report - .  (2026-07-09)

## Corpus Check
- Corpus is ~12,967 words - fits in a single context window. You may not need a graph.

## Summary
- 723 nodes · 1417 edges · 26 communities (25 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 95,496 input · 0 output

## Community Hubs (Navigation)
- Auth Guards, Decorators & Customers API
- Products DTOs & Validation
- Purchase Order DTOs & Validation
- API Contracts Documentation
- Suppliers DTOs & Validation
- App Bootstrap
- Order DTOs & Guest Checkout
- Categories Controller
- Reports DTOs & Query
- Users DTOs & Validation
- Package Dev Dependencies
- Inventory DTOs & Validation
- TS Compiler Options
- Audit Module
- Inventory & Orders Service Core
- Shared Pagination & Audit Service
- Package Runtime Dependencies
- Package Scripts
- Products Query & Service
- Jest Config
- Customers Service
- Package Metadata
- Nest CLI Config
- TS Build Config

## God Nodes (most connected - your core abstractions)
1. `PaginationQueryDto` - 37 edges
2. `PrismaService` - 33 edges
3. `AuthenticatedUser` - 29 edges
4. `compilerOptions` - 22 edges
5. `CurrentUser` - 19 edges
6. `ProductsService` - 18 edges
7. `paginatedResult` - 17 edges
8. `CreateOrderDto` - 16 edges
9. `ProductsController` - 15 edges
10. `InventoryService` - 14 edges

## Surprising Connections (you probably didn't know these)
- `RolesGuard Fail-Closed Default (RNF-02)` --rationale_for--> `RolesGuard`  [EXTRACTED]
  docs/API-CONTRACTS.md → src/auth/guards/roles.guard.ts
- `InventoryMovement Append-Only Pattern` --semantically_similar_to--> `audit-logs module (RF-12)`  [INFERRED] [semantically similar]
  prisma/ER-DIAGRAM.md → docs/API-CONTRACTS.md
- `ProductVariant.stock Source-of-Truth Pattern` --semantically_similar_to--> `InventoryService.applyMovement()`  [INFERRED] [semantically similar]
  prisma/ER-DIAGRAM.md → docs/API-CONTRACTS.md
- `inventario-api (Backend API)` --references--> `RolesGuard`  [EXTRACTED]
  README.md → src/auth/guards/roles.guard.ts
- `JwtAuthGuard` --shares_data_with--> `AuthenticatedUser`  [EXTRACTED]
  docs/API-CONTRACTS.md → src/auth/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Atomic Stock Mutation & Movement Consistency** — src_inventory_inventoryservice_applymovement, prisma_schema_productvariant, prisma_schema_inventorymovement, prisma_er_diagram_stock_source_of_truth, docs_api_contracts_atomic_stock_decrement [INFERRED 0.85]
- **Order Status Lifecycle & Stock Decrement Flow** — docs_api_contracts_orders_module, prisma_schema_order, prisma_schema_orderstatus, src_orders_orders_service_previous_status, prisma_er_diagram_immediate_stock_decrement [EXTRACTED 1.00]
- **API-Wide Cross-Cutting Conventions (Validation, Pagination, Fail-Closed Auth)** — docs_api_contracts_doc, docs_api_contracts_validationpipe, docs_api_contracts_pagination_pattern, docs_api_contracts_fail_closed_rolesguard [EXTRACTED 1.00]

## Communities (26 total, 1 thin omitted)

### Community 0 - "Auth Guards, Decorators & Customers API"
Cohesion: 0.06
Nodes (46): Gap: No Real JWT Yet, CurrentUser, Public(), RequiredPermission, RequirePermission(), RolesGuard, Injectable, JwtAuthGuard (+38 more)

### Community 1 - "Products DTOs & Validation"
Cohesion: 0.05
Nodes (44): IsUrl, CreateProductDto, ApiProperty, ApiPropertyOptional, IsNumber, IsOptional, IsPositive, IsString (+36 more)

### Community 2 - "Purchase Order DTOs & Validation"
Cohesion: 0.06
Nodes (43): CreatePurchaseOrderDto, CreatePurchaseOrderItemDto, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsDateString, IsInt (+35 more)

### Community 3 - "API Contracts Documentation"
Cohesion: 0.06
Nodes (56): Atomic Conditional UPDATE for Stock Decrement, audit-logs module (RF-12), categories module (RF-06), Concurrent Checkout Stock Test, customers module (RF-19), API-CONTRACTS.md, RolesGuard Fail-Closed Default (RNF-02), Gap: No Notifications Module (RF-20/RF-23) (+48 more)

### Community 4 - "Suppliers DTOs & Validation"
Cohesion: 0.07
Nodes (32): CreateSupplierDto, ApiProperty, ApiPropertyOptional, IsEmail, IsOptional, IsString, LinkProductDto, ApiProperty (+24 more)

### Community 5 - "App Bootstrap"
Cohesion: 0.08
Nodes (26): AppController, Controller, Get, AppModule, Module, AppService, Injectable, AuditModule (+18 more)

### Community 6 - "Order DTOs & Guest Checkout"
Cohesion: 0.09
Nodes (25): CreateOrderDto, CreateOrderItemDto, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsEmail, IsInt (+17 more)

### Community 7 - "Categories Controller"
Cohesion: 0.09
Nodes (22): Matches, CategoriesController, ApiTags, Body, Controller, Delete, Get, Param (+14 more)

### Community 8 - "Reports DTOs & Query"
Cohesion: 0.11
Nodes (25): Simplified Inventory Turnover Formula, reports module (RF-11), ReportPeriodQueryDto, SalesByPeriodQueryDto, TopProductsQueryDto, ApiPropertyOptional, IsDateString, IsIn (+17 more)

### Community 9 - "Users DTOs & Validation"
Cohesion: 0.08
Nodes (25): IsEnum, CreateUserDto, ApiProperty, IsEmail, IsString, MinLength, ApiPropertyOptional, IsBoolean (+17 more)

### Community 10 - "Package Dev Dependencies"
Cohesion: 0.07
Nodes (28): devDependencies, dotenv, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals (+20 more)

### Community 11 - "Inventory DTOs & Validation"
Cohesion: 0.08
Nodes (21): ADJUSTABLE_MOVEMENT_TYPES, CreateAdjustmentDto, ApiProperty, ApiPropertyOptional, IsIn, IsInt, IsOptional, IsPositive (+13 more)

### Community 12 - "TS Compiler Options"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 13 - "Audit Module"
Cohesion: 0.12
Nodes (12): AuditController, ApiTags, Controller, Get, Query, RequirePermission, AuditService, Injectable (+4 more)

### Community 14 - "Inventory & Orders Service Core"
Cohesion: 0.14
Nodes (9): ApplyMovementInput, DECREMENT_TYPES, InventoryService, Injectable, CANCELLABLE_STATUSES, LOGISTICS_TRANSITIONS, SALES_TRANSITIONS, PrismaService (+1 more)

### Community 15 - "Shared Pagination & Audit Service"
Cohesion: 0.19
Nodes (8): paginatedResult, PaginationQueryDto, ApiPropertyOptional, IsInt, IsOptional, Max, Min, Type

### Community 16 - "Package Runtime Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, bcryptjs, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/platform-express (+6 more)

### Community 17 - "Package Scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 18 - "Products Query & Service"
Cohesion: 0.20
Nodes (8): QueryProductsDto, ApiPropertyOptional, IsNumber, IsOptional, IsString, Min, Type, serializeProduct()

### Community 19 - "Jest Config"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 20 - "Customers Service"
Cohesion: 0.31
Nodes (3): CustomersService, toPublicCustomer(), Injectable

### Community 21 - "Package Metadata"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 22 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

## Knowledge Gaps
- **107 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+102 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Inventory & Orders Service Core` to `Purchase Order DTOs & Validation`, `API Contracts Documentation`, `Suppliers DTOs & Validation`, `App Bootstrap`, `Order DTOs & Guest Checkout`, `Categories Controller`, `Reports DTOs & Query`, `Inventory DTOs & Validation`, `Audit Module`, `Shared Pagination & Audit Service`, `Customers Service`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `PaginationQueryDto` connect `Shared Pagination & Audit Service` to `Auth Guards, Decorators & Customers API`, `Purchase Order DTOs & Validation`, `Suppliers DTOs & Validation`, `Order DTOs & Guest Checkout`, `Users DTOs & Validation`, `Inventory DTOs & Validation`, `Audit Module`, `Inventory & Orders Service Core`, `Products Query & Service`, `Customers Service`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `AuthenticatedUser` connect `Auth Guards, Decorators & Customers API` to `Products DTOs & Validation`, `Purchase Order DTOs & Validation`, `Order DTOs & Guest Checkout`, `Inventory DTOs & Validation`, `Inventory & Orders Service Core`, `Shared Pagination & Audit Service`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Guards, Decorators & Customers API` be split into smaller, more focused modules?**
  _Cohesion score 0.05879917184265011 - nodes in this community are weakly interconnected._
- **Should `Products DTOs & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.051360842844600525 - nodes in this community are weakly interconnected._
- **Should `Purchase Order DTOs & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.05734767025089606 - nodes in this community are weakly interconnected._