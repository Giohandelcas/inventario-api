import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// Prisma 7: PrismaClient ya no acepta una connection string embebida en el
// schema — exige un driver adapter explícito (o accelerateUrl). DATABASE_URL
// se lee acá, en runtime de la app; prisma.config.ts es solo para el CLI
// (migrate/generate/db push), nunca lo lee PrismaClient.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg(process.env.DATABASE_URL as string) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
