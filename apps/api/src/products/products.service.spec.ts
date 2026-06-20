import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';

const PRODUCT = {
  id: 'p1',
  name: 'Cola 330ml',
  sku: 'COLA-330',
  description: null,
  categoryId: null,
  unit: 'can',
  costPrice: new Prisma.Decimal('0.45'),
  sellingPrice: new Prisma.Decimal('1.20'),
  reorderLevel: 50,
  status: ProductStatus.ACTIVE,
  createdAt: new Date('2024-01-01'),
};

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

type ProductMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

function makeService(
  product: Partial<ProductMock> = {},
  category: { findUnique?: jest.Mock } = {},
): {
  service: ProductsService;
  product: ProductMock;
  category: { findUnique: jest.Mock };
  barcodes: { render: jest.Mock };
} {
  const productMethods: ProductMock = {
    create: jest.fn().mockResolvedValue(PRODUCT),
    findUnique: jest.fn().mockResolvedValue(PRODUCT),
    findMany: jest.fn().mockResolvedValue([PRODUCT]),
    update: jest.fn().mockResolvedValue(PRODUCT),
    ...product,
  };
  const categoryMethods = {
    findUnique:
      category.findUnique ?? jest.fn().mockResolvedValue({ id: 'cat1' }),
  };
  const prisma = { product: productMethods, category: categoryMethods };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  const barcodes = {
    render: jest.fn().mockResolvedValue('data:image/png;base64,AAA'),
  };
  const service = new ProductsService(
    prisma as never,
    activity as never,
    barcodes,
  );
  return {
    service,
    product: productMethods,
    category: categoryMethods,
    barcodes,
  };
}

describe('ProductsService', () => {
  describe('create', () => {
    it('maps Decimal prices to strings in the response', async () => {
      const { service } = makeService();
      const result = await service.create('u1', {
        name: 'Cola 330ml',
        sku: 'COLA-330',
      });
      expect(result.costPrice).toBe('0.45');
      expect(result.sellingPrice).toBe('1.20');
      expect(typeof result.costPrice).toBe('string');
    });

    it('validates the category exists when categoryId is given', async () => {
      const { service, category } = makeService();
      await service.create('u1', { name: 'X', sku: 'X-1', categoryId: 'cat1' });
      expect(category.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat1' } }),
      );
    });

    it('throws BadRequest when the categoryId does not exist', async () => {
      const { service } = makeService(
        {},
        { findUnique: jest.fn().mockResolvedValue(null) },
      );
      await expect(
        service.create('u1', { name: 'X', sku: 'X-1', categoryId: 'missing' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps a duplicate-SKU P2002 to a 409 Conflict', async () => {
      const { service } = makeService({
        create: jest.fn().mockRejectedValue(p2002()),
      });
      await expect(
        service.create('u1', { name: 'Dup', sku: 'COLA-330' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list', () => {
    it('excludes archived by default', async () => {
      const { service, product } = makeService();
      await service.list();
      const [arg] = product.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(arg.where).toHaveProperty('status', ProductStatus.ACTIVE);
    });

    it('includes archived when requested', async () => {
      const { service, product } = makeService();
      await service.list({ includeArchived: true });
      const [arg] = product.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(arg.where).not.toHaveProperty('status');
    });

    it('filters by categoryId', async () => {
      const { service, product } = makeService();
      await service.list({ categoryId: 'cat1' });
      const [arg] = product.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(arg.where).toHaveProperty('categoryId', 'cat1');
    });

    it('searches by name or sku (case-insensitive)', async () => {
      const { service, product } = makeService();
      await service.list({ search: 'cola' });
      const [arg] = product.findMany.mock.calls[0] as [
        { where: { OR?: unknown[] } },
      ];
      expect(arg.where.OR).toEqual([
        { name: { contains: 'cola', mode: 'insensitive' } },
        { sku: { contains: 'cola', mode: 'insensitive' } },
      ]);
    });

    it('maps each row to a DTO with string prices', async () => {
      const { service } = makeService();
      const [first] = await service.list();
      expect(first.costPrice).toBe('0.45');
    });
  });

  describe('findOne', () => {
    it('returns the product when found', async () => {
      const { service } = makeService();
      expect((await service.findOne('p1')).sku).toBe('COLA-330');
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
    it('throws NotFound when the product does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update('u1', 'nope', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a duplicate-SKU P2002 to a 409 Conflict', async () => {
      const { service } = makeService({
        update: jest.fn().mockRejectedValue(p2002()),
      });
      await expect(
        service.update('u1', 'p1', { sku: 'TAKEN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('barcode', () => {
    it('renders the product SKU and returns a BarcodeDto', async () => {
      const { service, barcodes } = makeService();
      const result = await service.barcode('p1', 'code128');
      expect(barcodes.render).toHaveBeenCalledWith('COLA-330', 'code128');
      expect(result).toEqual({
        value: 'COLA-330',
        symbology: 'code128',
        png: 'data:image/png;base64,AAA',
      });
    });

    it('throws NotFound when the product does not exist', async () => {
      const { service } = makeService({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      await expect(service.barcode('nope', 'code128')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('sets status to ARCHIVED (soft-delete, not hard delete)', async () => {
      const archived = { ...PRODUCT, status: ProductStatus.ARCHIVED };
      const { service, product } = makeService({
        update: jest.fn().mockResolvedValue(archived),
      });
      const result = await service.archive('u1', 'p1');
      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { status: ProductStatus.ARCHIVED },
        }),
      );
      expect(result.status).toBe(ProductStatus.ARCHIVED);
    });
  });
});
