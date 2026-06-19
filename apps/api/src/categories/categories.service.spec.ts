import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesService } from './categories.service';

const ROOT_CATEGORY = {
  id: 'c1',
  name: 'Beverages',
  parentId: null,
  createdAt: new Date('2024-01-01'),
};

type PrismaCategoryMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
};

function makeService(overrides: Partial<PrismaCategoryMock> = {}): {
  service: CategoriesService;
  prisma: PrismaCategoryMock;
} {
  const defaults: PrismaCategoryMock = {
    create: jest.fn().mockResolvedValue(ROOT_CATEGORY),
    findUnique: jest.fn().mockResolvedValue(ROOT_CATEGORY),
    findMany: jest.fn().mockResolvedValue([ROOT_CATEGORY]),
    update: jest.fn().mockResolvedValue(ROOT_CATEGORY),
    delete: jest.fn().mockResolvedValue(ROOT_CATEGORY),
    count: jest.fn().mockResolvedValue(0),
  };
  const categoryMethods: PrismaCategoryMock = { ...defaults, ...overrides };
  const prisma = { category: categoryMethods };
  const service = new CategoriesService(prisma as never);
  return { service, prisma: prisma.category };
}

describe('CategoriesService', () => {
  describe('create', () => {
    it('creates a root category (no parent lookup)', async () => {
      const { service, prisma } = makeService();
      const dto: CreateCategoryDto = { name: 'Beverages' };
      const result = await service.create(dto);
      expect(prisma.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: dto }),
      );
      expect(prisma.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(ROOT_CATEGORY);
    });

    it('validates the parent exists when parentId is given', async () => {
      const { service, prisma } = makeService();
      await service.create({ name: 'Sodas', parentId: 'c1' });
      expect(prisma.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' } }),
      );
      expect(prisma.create).toHaveBeenCalled();
    });

    it('throws BadRequest when the parentId does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.create({ name: 'Sodas', parentId: 'missing' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns all categories ordered by name', async () => {
      const { service, prisma } = makeService();
      const result = await service.list();
      const [callArg] = prisma.findMany.mock.calls[0] as [
        { orderBy: Record<string, string> },
      ];
      expect(callArg.orderBy).toEqual({ name: 'asc' });
      expect(result).toEqual([ROOT_CATEGORY]);
    });
  });

  describe('findOne', () => {
    it('returns the category when found', async () => {
      const { service } = makeService();
      expect(await service.findOne('c1')).toEqual(ROOT_CATEGORY);
    });

    it('throws NotFound when missing', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('patches the name', async () => {
      const updated = { ...ROOT_CATEGORY, name: 'Drinks' };
      const { service, prisma } = makeService({
        update: jest.fn().mockResolvedValue(updated),
      });
      const result = await service.update('c1', { name: 'Drinks' });
      expect(prisma.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: { name: 'Drinks' },
        }),
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFound when the category does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update('nope', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when a category is set as its own parent', async () => {
      const { service } = makeService();
      await expect(
        service.update('c1', { parentId: 'c1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws Conflict when re-parenting would create a cycle', async () => {
      // c1 -> parent c2 -> parent c1 : making c1's parent c2 (a descendant) cycles.
      // ensureExists(c1) ok; parent c2 exists; walking up from c2 reaches c1.
      const findUnique = jest
        .fn()
        // ensureExists(c1)
        .mockResolvedValueOnce({ id: 'c1' })
        // ensureParentExists(c2)
        .mockResolvedValueOnce({ id: 'c2' })
        // cycle walk: c2's parent is c1
        .mockResolvedValueOnce({ parentId: 'c1' });
      const { service } = makeService({ findUnique });
      await expect(
        service.update('c1', { parentId: 'c2' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('hard-deletes a leaf category (no children)', async () => {
      const { service, prisma } = makeService({
        count: jest.fn().mockResolvedValue(0),
      });
      await service.remove('c1');
      expect(prisma.count).toHaveBeenCalledWith({ where: { parentId: 'c1' } });
      expect(prisma.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' } }),
      );
    });

    it('throws Conflict when the category has children', async () => {
      const { service, prisma } = makeService({
        count: jest.fn().mockResolvedValue(2),
      });
      await expect(service.remove('c1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the category does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(service.remove('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
