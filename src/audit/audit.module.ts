import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

// Global: UsersService/ProductsService lo inyectan para loguear cambios
// sensibles (rol, precio/costo) sin que cada módulo tenga que importar AuditModule.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
