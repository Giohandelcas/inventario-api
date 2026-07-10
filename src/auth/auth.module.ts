import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';

/**
 * Aplica RolesGuard globalmente. Todavía NO incluye JwtAuthGuard/JwtStrategy
 * (Próximos Pasos #7) — hasta que exista, request.user siempre es undefined
 * y todo actor se resuelve como PUBLICO (ver roles.guard.ts).
 */
@Module({
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AuthModule {}
