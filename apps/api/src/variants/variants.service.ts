import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductVariantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { StorageService } from '../storage/storage.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantDto } from './dto/variant.dto';
import { BarcodeService, type Symbology } from '../barcodes/barcode.service';
import { BarcodeDto } from '../barcodes/dto/barcode.dto';

const variantSelect = {
  id: true,
  productId: true,
  sku: true,
  barcode: true,
  attributes: true,
  status: true,
  imageKey: true,
  createdAt: true,
} satisfies Prisma.ProductVariantSelect;

type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  attributes: Prisma.JsonValue;
  status: ProductVariantStatus;
  imageKey: string | null;
  createdAt: Date;
};

export interface ListVariantsOptions {
  includeArchived?: boolean;
}

@Injectable()
export class VariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly barcodes: BarcodeService,
    private readonly storage: StorageService,
  ) {}

  async barcode(
    productId: string,
    id: string,
    symbology: Symbology = 'code128',
  ): Promise<BarcodeDto> {
    const variant = await this.findVariant(productId, id);
    // A variant's own barcode value wins; fall back to its SKU.
    const value = variant.barcode ?? variant.sku;
    return {
      value,
      symbology,
      png: await this.barcodes.render(value, symbology),
    };
  }

  private toDto(v: VariantRow): VariantDto {
    return {
      ...v,
      attributes: (v.attributes ?? {}) as Record<string, string>,
      imageUrl: this.storage.getUrl(v.imageKey),
    };
  }

  async create(
    userId: string,
    productId: string,
    dto: CreateVariantDto,
  ): Promise<VariantDto> {
    await this.ensureProductExists(productId);
    await this.assertSkuAvailable(dto.sku);
    try {
      const created = await this.prisma.productVariant.create({
        data: {
          productId,
          sku: dto.sku,
          barcode: dto.barcode,
          attributes: dto.attributes ?? {},
        },
        select: variantSelect,
      });
      await this.activity.record({
        userId,
        action: 'VARIANT_CREATE',
        entityType: 'ProductVariant',
        entityId: created.id,
        summary: `Created variant ${created.sku}`,
      });
      return this.toDto(created);
    } catch (e) {
      this.rethrowSkuConflict(e);
    }
  }

  async list(
    productId: string,
    opts?: ListVariantsOptions,
  ): Promise<VariantDto[]> {
    await this.ensureProductExists(productId);
    const rows = (await this.prisma.productVariant.findMany({
      where: {
        productId,
        ...(opts?.includeArchived
          ? {}
          : { status: ProductVariantStatus.ACTIVE }),
      },
      select: variantSelect,
      orderBy: { sku: 'asc' },
    })) as VariantRow[];
    return rows.map((r) => this.toDto(r));
  }

  async findOne(productId: string, id: string): Promise<VariantDto> {
    const variant = await this.findVariant(productId, id);
    return this.toDto(variant);
  }

  async update(
    userId: string,
    productId: string,
    id: string,
    dto: UpdateVariantDto,
  ): Promise<VariantDto> {
    await this.findVariant(productId, id);
    if (dto.sku) await this.assertSkuAvailable(dto.sku, id);
    try {
      const updated = await this.prisma.productVariant.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
          ...(dto.attributes !== undefined
            ? { attributes: dto.attributes }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
        select: variantSelect,
      });
      await this.activity.record({
        userId,
        action: 'VARIANT_UPDATE',
        entityType: 'ProductVariant',
        entityId: id,
        summary: `Updated variant ${updated.sku}`,
      });
      return this.toDto(updated);
    } catch (e) {
      this.rethrowSkuConflict(e);
    }
  }

  async archive(
    userId: string,
    productId: string,
    id: string,
  ): Promise<VariantDto> {
    await this.findVariant(productId, id);
    const archived = await this.prisma.productVariant.update({
      where: { id },
      data: { status: ProductVariantStatus.ARCHIVED },
      select: variantSelect,
    });
    await this.activity.record({
      userId,
      action: 'VARIANT_ARCHIVE',
      entityType: 'ProductVariant',
      entityId: id,
      summary: `Archived variant ${archived.sku}`,
    });
    return this.toDto(archived);
  }

  async uploadImage(
    userId: string,
    productId: string,
    id: string,
    file: Express.Multer.File,
  ): Promise<VariantDto> {
    // Fetch only the fields needed for the pre-flight check.
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true, productId: true, imageKey: true },
    });
    if (!existing || existing.productId !== productId) {
      throw new NotFoundException('Variant not found');
    }

    // Atomic replacement order:
    //   1. Save the new file.
    //   2. Update the DB; if this fails, delete the new file (roll back).
    //   3. Only after commit, delete the old file.
    const { key } = await this.storage.save(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'product-variants',
    );

    let updated: VariantRow;
    try {
      updated = await this.prisma.productVariant.update({
        where: { id },
        data: { imageKey: key },
        select: variantSelect,
      });
    } catch (err) {
      // DB update failed — remove the newly saved file to avoid an orphan.
      await this.storage.delete(key).catch(() => undefined);
      throw err;
    }

    // DB is now pointing at the new file; safe to remove the old one.
    if (existing.imageKey) {
      await this.storage.delete(existing.imageKey).catch(() => undefined);
    }

    await this.activity.record({
      userId,
      action: 'VARIANT_UPDATE',
      entityType: 'ProductVariant',
      entityId: id,
      summary: `Uploaded image for variant ${updated.sku}`,
    });

    return this.toDto(updated);
  }

  async deleteImage(
    userId: string,
    productId: string,
    id: string,
  ): Promise<VariantDto> {
    // Fetch only the fields needed; full row is fetched after the update via variantSelect.
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true, productId: true, imageKey: true },
    });
    if (!existing || existing.productId !== productId) {
      throw new NotFoundException('Variant not found');
    }
    // Alias so the rest of the method is unchanged.
    const variant = existing;

    if (variant.imageKey) {
      await this.storage.delete(variant.imageKey);
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: { imageKey: null },
      select: variantSelect,
    });

    await this.activity.record({
      userId,
      action: 'VARIANT_UPDATE',
      entityType: 'ProductVariant',
      entityId: id,
      summary: `Removed image for variant ${updated.sku}`,
    });

    return this.toDto(updated);
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
  }

  private async findVariant(
    productId: string,
    id: string,
  ): Promise<VariantRow> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      select: variantSelect,
    });
    // Treat a variant under a different product as not found — the route is
    // nested, so the variant must belong to the product in the path.
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  // SKU is a single namespace shared by products and variants. The DB enforces
  // uniqueness within each table; this guards cross-table collisions (tables
  // are separate, so no single constraint can). Mirrors CategoriesService's
  // cross-entity 409 precedent.
  private async assertSkuAvailable(
    sku: string,
    exceptVariantId?: string,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (product) {
      throw new ConflictException('A product with this SKU already exists');
    }
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (variant && variant.id !== exceptVariantId) {
      throw new ConflictException('A variant with this SKU already exists');
    }
  }

  private rethrowSkuConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('A variant with this SKU already exists');
    }
    throw e;
  }
}
