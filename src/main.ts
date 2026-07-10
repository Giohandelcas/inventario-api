import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // RNF-03: toda entrada de usuario se valida en backend, no solo en frontend.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Ambos frontends (inventario-app, inventario-tienda) corren en orígenes
  // distintos y consumen esta API.
  app.enableCors();

  // RNF-07: la API debe estar documentada (Swagger/OpenAPI).
  const config = new DocumentBuilder()
    .setTitle('inventario-api')
    .setDescription('API del sistema de Inventario + Tienda en Línea. Ver ../inventario-app/requerimientos.md')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
