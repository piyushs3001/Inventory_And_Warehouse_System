import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { InventoryService } from './inventory.service';
import { AdjustableBucket } from './dto/adjust-stock.dto';

// Pure guard/validation paths that never reach the database, so a bare stub
// PrismaService is enough. DB behaviour (atomic movement + rollback) is covered
// by test/inventory.e2e-spec.ts against the real database.
describe('InventoryService (guards)', () => {
  const prisma = {} as unknown as PrismaService;
  // Guard paths reject before any stock mutation, so activity/notifications
  // are never reached — bare stubs suffice.
  const service = new InventoryService(prisma, {} as never, {} as never);

  const global: WarehouseScope = { isGlobal: true };
  const scopedToW1: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };

  it('rejects a zero-delta adjustment before touching the database', async () => {
    await expect(
      service.adjust(global, 'user-1', {
        productId: 'p1',
        warehouseId: 'w1',
        bucket: AdjustableBucket.AVAILABLE,
        delta: 0,
        reason: 'noop',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an adjustment to a warehouse outside the caller scope', async () => {
    await expect(
      service.adjust(scopedToW1, 'user-1', {
        productId: 'p1',
        warehouseId: 'w2',
        bucket: AdjustableBucket.AVAILABLE,
        delta: 5,
        reason: 'out of scope',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a reservation against an out-of-scope warehouse', async () => {
    await expect(
      service.reserve(scopedToW1, 'user-1', {
        productId: 'p1',
        warehouseId: 'w2',
        quantity: 3,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
