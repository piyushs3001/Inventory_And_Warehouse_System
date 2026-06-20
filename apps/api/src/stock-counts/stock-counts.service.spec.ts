import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WarehouseScope } from '../auth/auth.types';
import { StockCountsService } from './stock-counts.service';

describe('StockCountsService (guards)', () => {
  const prisma = {} as unknown as PrismaService;
  const inventory = {} as InventoryService;
  const service = new StockCountsService(prisma, inventory, {} as never);
  const scopedToW1: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };

  it('rejects opening a count for an out-of-scope warehouse (before DB)', async () => {
    await expect(
      service.create(scopedToW1, 'u1', { warehouseId: 'w2' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
