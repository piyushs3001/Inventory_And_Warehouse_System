import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { WarehouseScope } from '../auth/auth.types';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService (guards/validation)', () => {
  const prisma = {
    supplier: { findUnique: () => Promise.resolve({ id: 's1' }) },
    warehouse: { findUnique: () => Promise.resolve({ id: 'w1' }) },
  } as unknown as PrismaService;
  const inventory = {} as InventoryService;
  const service = new PurchaseOrdersService(
    prisma,
    inventory,
    {} as never,
    {} as never,
  );

  const global: WarehouseScope = { isGlobal: true };
  const scopedToW1: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };

  it('rejects creating a PO for a warehouse outside scope (before any DB work)', async () => {
    await expect(
      service.create(scopedToW1, 'u1', {
        supplierId: 's1',
        warehouseId: 'w2',
        lines: [{ productId: 'p1', quantity: 1, unitCost: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate products in order lines', async () => {
    await expect(
      service.create(global, 'u1', {
        supplierId: 's1',
        warehouseId: 'w1',
        lines: [
          { productId: 'p1', quantity: 1, unitCost: 1 },
          { productId: 'p1', quantity: 2, unitCost: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
