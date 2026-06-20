import { NotFoundException } from '@nestjs/common';
import { WarehouseStatus } from '@prisma/client';
import type { WarehouseScope } from '../auth/auth.types';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousesService } from './warehouses.service';

const GLOBAL_SCOPE: WarehouseScope = { isGlobal: true };
const SCOPED_SCOPE: WarehouseScope = {
  isGlobal: false,
  warehouseIds: ['w1', 'w2'],
};
const EMPTY_SCOPE: WarehouseScope = { isGlobal: false, warehouseIds: [] };

const ACTIVE_WAREHOUSE = {
  id: 'w1',
  name: 'Central Warehouse',
  address: '123 Main St',
  contactPerson: 'Alice',
  capacity: 1000,
  status: WarehouseStatus.ACTIVE,
  createdAt: new Date('2024-01-01'),
};

type PrismaWarehouseMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

function makeService(overrides: Partial<PrismaWarehouseMock> = {}): {
  service: WarehousesService;
  prisma: PrismaWarehouseMock;
} {
  const defaults: PrismaWarehouseMock = {
    create: jest.fn().mockResolvedValue(ACTIVE_WAREHOUSE),
    findFirst: jest.fn().mockResolvedValue(ACTIVE_WAREHOUSE),
    findUnique: jest.fn().mockResolvedValue(ACTIVE_WAREHOUSE),
    findMany: jest.fn().mockResolvedValue([ACTIVE_WAREHOUSE]),
    update: jest.fn().mockResolvedValue(ACTIVE_WAREHOUSE),
  };
  const warehouseMethods: PrismaWarehouseMock = { ...defaults, ...overrides };
  const prisma = { warehouse: warehouseMethods };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new WarehousesService(prisma as never, activity as never);
  return { service, prisma: prisma.warehouse };
}

describe('WarehousesService', () => {
  describe('create', () => {
    it('calls prisma.warehouse.create with the dto and warehouseSelect', async () => {
      const { service, prisma } = makeService();
      const dto: CreateWarehouseDto = { name: 'New Warehouse' };
      const result = await service.create('u1', dto);
      expect(prisma.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: dto }),
      );
      expect(result).toEqual(ACTIVE_WAREHOUSE);
    });

    it('passes optional fields to create', async () => {
      const { service, prisma } = makeService();
      const dto: CreateWarehouseDto = {
        name: 'Full Warehouse',
        address: '456 Oak Ave',
        contactPerson: 'Bob',
        capacity: 500,
      };
      await service.create('u1', dto);
      expect(prisma.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: dto }),
      );
    });
  });

  describe('list', () => {
    it('omits id filter for global scope', async () => {
      const { service, prisma } = makeService();
      await service.list(GLOBAL_SCOPE);
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { where: Record<string, unknown>; orderBy: Record<string, string> },
      ];
      expect(callArg.where).not.toHaveProperty('id');
      expect(callArg.orderBy).toEqual({ name: 'asc' });
    });

    it('adds { id: { in: [...] } } filter for scoped user', async () => {
      const { service, prisma } = makeService();
      await service.list(SCOPED_SCOPE);
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { where: { id: { in: string[] } } },
      ];
      expect(callArg.where).toHaveProperty('id', { in: ['w1', 'w2'] });
    });

    it('defaults to excluding INACTIVE warehouses', async () => {
      const { service, prisma } = makeService();
      await service.list(GLOBAL_SCOPE);
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { where: { status: WarehouseStatus } },
      ];
      expect(callArg.where).toHaveProperty('status', WarehouseStatus.ACTIVE);
    });

    it('includes INACTIVE when includeArchived is true', async () => {
      const { service, prisma } = makeService();
      await service.list(GLOBAL_SCOPE, { includeArchived: true });
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(callArg.where).not.toHaveProperty('status');
    });

    it('returns empty array for empty scope (fail-closed)', async () => {
      const { service, prisma } = makeService({
        findMany: jest.fn().mockResolvedValue([]),
      });
      const result = await service.list(EMPTY_SCOPE);
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { where: { id: { in: string[] } } },
      ];
      expect(callArg.where).toHaveProperty('id', { in: [] });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the warehouse when found in scope', async () => {
      const { service } = makeService();
      const result = await service.findOne('w1', GLOBAL_SCOPE);
      expect(result).toEqual(ACTIVE_WAREHOUSE);
    });

    it('applies scope filter to findFirst using AND to avoid field collision', async () => {
      const { service, prisma } = makeService();
      await service.findOne('w1', SCOPED_SCOPE);
      const [callArg] = prisma.findFirst.mock.calls[0] as [
        { where: { AND: [{ id: string }, { id?: { in: string[] } }] } },
      ];
      // AND[0] is the exact id match
      expect(callArg.where.AND[0]).toEqual({ id: 'w1' });
      // AND[1] is the scope filter: { id: { in: ['w1', 'w2'] } }
      expect(callArg.where.AND[1]).toEqual({ id: { in: ['w1', 'w2'] } });
    });

    it('throws NotFoundException when row not found (out-of-scope id → null → 404)', async () => {
      const { service } = makeService({
        findFirst: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.findOne('w-other', SCOPED_SCOPE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException for out-of-scope id even with global scope returning null', async () => {
      const { service } = makeService({
        findFirst: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.findOne('nonexistent', GLOBAL_SCOPE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('calls ensureExists then updates with dto', async () => {
      const updatedWarehouse = { ...ACTIVE_WAREHOUSE, name: 'Updated Name' };
      const { service, prisma } = makeService({
        update: jest.fn().mockResolvedValue(updatedWarehouse),
      });
      const dto: UpdateWarehouseDto = { name: 'Updated Name' };
      const result = await service.update('u1', 'w1', dto);
      expect(prisma.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'w1' } }),
      );
      expect(prisma.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'w1' }, data: dto }),
      );
      expect(result).toEqual(updatedWarehouse);
    });

    it('throws NotFoundException when warehouse does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update('u1', 'nonexistent', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('archive', () => {
    it('sets status to INACTIVE (soft-delete, not hard delete)', async () => {
      const archivedWarehouse = {
        ...ACTIVE_WAREHOUSE,
        status: WarehouseStatus.INACTIVE,
      };
      const { service, prisma } = makeService({
        update: jest.fn().mockResolvedValue(archivedWarehouse),
      });
      const result = await service.archive('u1', 'w1');
      expect(prisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'w1' },
          data: { status: WarehouseStatus.INACTIVE },
        }),
      );
      expect(result.status).toBe(WarehouseStatus.INACTIVE);
    });

    it('throws NotFoundException when warehouse does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(service.archive('u1', 'nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('assignStaff', () => {
    it('uses set relation to assign users to warehouse', async () => {
      const { service, prisma } = makeService();
      const dto: AssignStaffDto = { userIds: ['u1', 'u2'] };
      await service.assignStaff('u1', 'w1', dto);
      expect(prisma.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'w1' } }),
      );
      expect(prisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'w1' },
          data: {
            users: {
              set: [{ id: 'u1' }, { id: 'u2' }],
            },
          },
        }),
      );
    });

    it('throws NotFoundException when warehouse does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.assignStaff('u1', 'nonexistent', { userIds: ['u1'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts empty userIds array (removes all staff from scope)', async () => {
      const { service, prisma } = makeService();
      await service.assignStaff('u1', 'w1', { userIds: [] });
      expect(prisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { users: { set: [] } },
        }),
      );
    });
  });
});
