import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProductVariantStatus } from '@prisma/client';
import { VariantsService } from './variants.service';

const VARIANT = {
  id: 'v1',
  productId: 'p1',
  sku: 'COLA-330-RED',
  barcode: null,
  attributes: { size: 'L', color: 'Red' },
  status: ProductVariantStatus.ACTIVE,
  createdAt: new Date('2024-01-01'),
};

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

type VariantMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

function makeService(
  variant: Partial<VariantMock> = {},
  product: { findUnique?: jest.Mock } = {},
): {
  service: VariantsService;
  variant: VariantMock;
  product: { findUnique: jest.Mock };
} {
  const variantMethods: VariantMock = {
    create: jest.fn().mockResolvedValue(VARIANT),
    // default: no SKU collision (assertSkuAvailable variant lookup → null),
    // but findVariant in update/archive needs the row — overridden per test.
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([VARIANT]),
    update: jest.fn().mockResolvedValue(VARIANT),
    ...variant,
  };
  const productMethods = {
    // Default: the product exists (lookup by id) but does NOT own the SKU
    // (lookup by sku → null), so the happy path doesn't trip the SKU check.
    findUnique:
      product.findUnique ??
      jest.fn((args: { where: { sku?: string } }) =>
        Promise.resolve(args.where.sku ? null : { id: 'p1' }),
      ),
  };
  const prisma = { productVariant: variantMethods, product: productMethods };
  const activity = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new VariantsService(prisma as never, activity as never);
  return { service, variant: variantMethods, product: productMethods };
}

describe('VariantsService', () => {
  describe('create', () => {
    it('creates and returns a variant DTO with attributes', async () => {
      const { service } = makeService();
      const result = await service.create('u1', 'p1', { sku: 'COLA-330-RED' });
      expect(result.sku).toBe('COLA-330-RED');
      expect(result.attributes).toEqual({ size: 'L', color: 'Red' });
    });

    it('throws NotFound when the product does not exist', async () => {
      const { service } = makeService(
        {},
        { findUnique: jest.fn().mockResolvedValue(null) },
      );
      await expect(
        service.create('u1', 'missing', { sku: 'X-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Conflict when the SKU is taken by a product', async () => {
      // product.findUnique serves both the existence check (by id) and the
      // cross-table SKU check (by sku); make the SKU lookup find a product.
      const productFindUnique = jest.fn((args: { where: { sku?: string } }) =>
        Promise.resolve(args.where.sku ? { id: 'someProduct' } : { id: 'p1' }),
      );
      const { service } = makeService({}, { findUnique: productFindUnique });
      await expect(
        service.create('u1', 'p1', { sku: 'TAKEN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws Conflict when the SKU is taken by another variant', async () => {
      // No product owns the SKU, but another variant does.
      const productFindUnique = jest.fn((args: { where: { sku?: string } }) =>
        Promise.resolve(args.where.sku ? null : { id: 'p1' }),
      );
      const { service } = makeService(
        { findUnique: jest.fn().mockResolvedValue({ id: 'otherVariant' }) },
        { findUnique: productFindUnique },
      );
      await expect(
        service.create('u1', 'p1', { sku: 'TAKEN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a duplicate-SKU P2002 to a 409 Conflict', async () => {
      const { service } = makeService({
        create: jest.fn().mockRejectedValue(p2002()),
      });
      await expect(
        service.create('u1', 'p1', { sku: 'COLA-330-RED' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list', () => {
    it('excludes archived by default', async () => {
      const { service, variant } = makeService();
      await service.list('p1');
      const [arg] = variant.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(arg.where).toHaveProperty('status', ProductVariantStatus.ACTIVE);
      expect(arg.where).toHaveProperty('productId', 'p1');
    });

    it('includes archived when requested', async () => {
      const { service, variant } = makeService();
      await service.list('p1', { includeArchived: true });
      const [arg] = variant.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(arg.where).not.toHaveProperty('status');
    });

    it('throws NotFound when the product does not exist', async () => {
      const { service } = makeService(
        {},
        { findUnique: jest.fn().mockResolvedValue(null) },
      );
      await expect(service.list('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOne / update scoping', () => {
    it('throws NotFound when the variant belongs to another product', async () => {
      const { service } = makeService({
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...VARIANT, productId: 'other' }),
      });
      await expect(service.findOne('p1', 'v1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('update maps a duplicate-SKU P2002 to a 409 Conflict', async () => {
      const { service } = makeService({
        // findVariant succeeds (variant under p1); assertSkuAvailable finds no
        // collision; update throws P2002.
        findUnique: jest.fn().mockResolvedValue(VARIANT),
        update: jest.fn().mockRejectedValue(p2002()),
      });
      await expect(
        service.update('u1', 'p1', 'v1', { sku: 'TAKEN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('archive', () => {
    it('sets status to ARCHIVED (soft-delete, not hard delete)', async () => {
      const archived = { ...VARIANT, status: ProductVariantStatus.ARCHIVED };
      const { service, variant } = makeService({
        findUnique: jest.fn().mockResolvedValue(VARIANT),
        update: jest.fn().mockResolvedValue(archived),
      });
      const result = await service.archive('u1', 'p1', 'v1');
      expect(variant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: { status: ProductVariantStatus.ARCHIVED },
        }),
      );
      expect(result.status).toBe(ProductVariantStatus.ARCHIVED);
    });
  });
});
