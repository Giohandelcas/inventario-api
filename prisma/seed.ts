import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';

const SALT_ROUNDS = 10;

/**
 * Crea el primer usuario ADMIN si todavía no existe ninguno. Existe porque
 * POST /users ya requiere ser ADMIN a propósito (RNF-02) — sin este script,
 * la única forma de arrancar era escribir directo contra Prisma a mano (ver
 * "Qué falta para producción" en docs/API-CONTRACTS.md).
 *
 * Uso: npx prisma db seed (o `npm run seed`), con SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD en el entorno (si no están, usa defaults de dev).
 */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL as string),
  });

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
  if (existingAdmin) {
    console.log(
      `Ya existe un ADMIN (${existingAdmin.email}), no se crea ninguno nuevo.`,
    );
    await prisma.$disconnect();
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@inventario.test';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
  });

  console.log(`ADMIN creado: ${admin.email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Password de dev (cambiarla luego): ${password}`);
  }

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
