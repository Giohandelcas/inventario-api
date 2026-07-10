import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Orden de los APP_GUARD importa: OptionalJwtAuthGuard corre primero y
 * puebla `request.user` si hay un Bearer token válido (sin rechazar la
 * request si no lo hay — eso rompería las rutas @Public()); RolesGuard corre
 * después y aplica la matriz de permisos contra ese `request.user` (o
 * PUBLICO si quedó undefined).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // Segundos, no un string tipo "7d" — evita pelear con el tipo
        // StringValue de `ms`. ConfigService.get<number>() NO castea: el
        // valor real que llega de process.env sigue siendo un string, hay
        // que convertirlo explícitamente o jsonwebtoken lo interpreta como
        // milisegundos en vez de segundos.
        signOptions: {
          expiresIn: Number(
            config.get<string>('JWT_EXPIRES_IN_SECONDS', String(7 * 24 * 60 * 60)),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: OptionalJwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
