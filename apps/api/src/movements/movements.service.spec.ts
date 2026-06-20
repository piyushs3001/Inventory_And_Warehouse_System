import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { MovementsService } from './movements.service';

describe('MovementsService (query validation)', () => {
  const prisma = {} as unknown as PrismaService;
  const service = new MovementsService(prisma);
  const global: WarehouseScope = { isGlobal: true };

  it('rejects an invalid "from" date before querying', async () => {
    await expect(
      service.list(global, { from: 'not-a-date', page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid "to" date before querying', async () => {
    await expect(
      service.list(global, { to: 'nonsense', page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
