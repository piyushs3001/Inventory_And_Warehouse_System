import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_STAFF_EMAIL ?? 'staff@iws.local';
  const password = process.env.SEED_STAFF_PASSWORD ?? 'Staff@12345';

  const passwordHash = await bcrypt.hash(password, 10);

  // Scope the staff user to the seeded Central Warehouse.
  const warehouse = await prisma.warehouse.findFirst({
    where: { name: 'Central Warehouse' },
  });
  if (!warehouse) {
    throw new Error('Central Warehouse not found — run the base seed first.');
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      warehouses: { set: [{ id: warehouse.id }] },
    },
    create: {
      name: 'Floor Staff',
      email,
      passwordHash,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      warehouses: { connect: [{ id: warehouse.id }] },
    },
  });

  console.log(`Seeded STAFF <${email}> scoped to "${warehouse.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
