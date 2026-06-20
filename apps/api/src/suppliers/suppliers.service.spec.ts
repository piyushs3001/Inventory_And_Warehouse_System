import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService.performance', () => {
  it('returns zeroed counts and null ratios for a supplier with no orders', async () => {
    const prisma = {
      supplier: { findUnique: () => Promise.resolve({ id: 's1' }) },
      purchaseOrder: { findMany: () => Promise.resolve([]) },
    } as unknown as PrismaService;
    const service = new SuppliersService(prisma, {} as never);

    const perf = await service.performance('s1');
    expect(perf).toEqual({
      supplierId: 's1',
      totalOrders: 0,
      completedOrders: 0,
      unitsOrdered: 0,
      unitsReceived: 0,
      unitsDamaged: 0,
      quantityAccuracy: null,
      damageRate: null,
      onTimeRate: null,
    });
  });

  it('throws NotFound when the supplier does not exist', async () => {
    const prisma = {
      supplier: { findUnique: () => Promise.resolve(null) },
    } as unknown as PrismaService;
    const service = new SuppliersService(prisma, {} as never);
    await expect(service.performance('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
