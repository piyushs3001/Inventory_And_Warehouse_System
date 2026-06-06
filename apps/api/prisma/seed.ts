import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@iws.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Super Admin', email, passwordHash, role: Role.SUPER_ADMIN },
  });

  for (const name of ['Central Warehouse', 'North Depot']) {
    const existing = await prisma.warehouse.findFirst({ where: { name } });
    if (!existing) await prisma.warehouse.create({ data: { name } });
  }

  console.log(`Seeded Super Admin <${email}> and sample warehouses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
