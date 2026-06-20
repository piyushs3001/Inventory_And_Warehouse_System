import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WarehouseScope } from '../auth/auth.types';
import { TransfersService } from './transfers.service';

describe('TransfersService (guards)', () => {
  const prisma = {} as unknown as PrismaService;
  const inventory = {} as InventoryService;
  const service = new TransfersService(prisma, inventory, {} as never);
  const scopedToW1: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };

  it('rejects a transfer with the same source and destination (before DB)', async () => {
    await expect(
      service.create({ isGlobal: true }, 'u1', {
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w1',
        lines: [{ productId: 'p1', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects requesting a transfer out of an out-of-scope source', async () => {
    await expect(
      service.create(scopedToW1, 'u1', {
        sourceWarehouseId: 'w2',
        destinationWarehouseId: 'w1',
        lines: [{ productId: 'p1', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
