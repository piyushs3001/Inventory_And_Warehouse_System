import { Prisma } from '@prisma/client';

// Never expose passwordHash / hashedRefreshToken.
export const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  warehouses: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof userSafeSelect }>;
