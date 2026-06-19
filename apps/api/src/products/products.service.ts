import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';

const productSelect = {
  id: true,
  name: true,
  sku: true,
  description: true,
  categoryId: true,
  unit: true,
  costPrice: true,
  sellingPrice: true,
  reorderLevel: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ProductSelect;

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string | null;
  unit: string | null;
  costPrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  reorderLevel: number;
  status: ProductStatus;
  createdAt: Date;
};

export interface ListProductsOptions {
  includeArchived?: boolean;
  categoryId?: string;
  search?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Decimal prices serialize as fixed 2-decimal strings: JSON never loses
  // precision to a float, and the money format stays consistent (e.g. "1.20",
  // not Decimal's canonical "1.2") to match the Decimal(12,2) column.
  private toDto(p: ProductRow): ProductDto {
    return {
      ...p,
      costPrice: p.costPrice.toFixed(2),
      sellingPrice: p.sellingPrice.toFixed(2),
    };
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);
    try {
      const created = await this.prisma.product.create({
        data: dto,
        select: productSelect,
      });
      return this.toDto(created);
    } catch (e) {
      this.rethrowSkuConflict(e);
    }
  }

  async list(opts?: ListProductsOptions): Promise<ProductDto[]> {
    const rows = (await this.prisma.product.findMany({
      where: {
        ...(opts?.includeArchived ? {} : { status: ProductStatus.ACTIVE }),
        ...(opts?.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts?.search
          ? {
              OR: [
                { name: { contains: opts.search, mode: 'insensitive' } },
                { sku: { contains: opts.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: productSelect,
      orderBy: { name: 'asc' },
    })) as ProductRow[];
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: productSelect,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.toDto(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    await this.ensureExists(id);
    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);
    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: dto,
        select: productSelect,
      });
      return this.toDto(updated);
    } catch (e) {
      this.rethrowSkuConflict(e);
    }
  }

  async archive(id: string): Promise<ProductDto> {
    await this.ensureExists(id);
    const archived = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
      select: productSelect,
    });
    return this.toDto(archived);
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Product not found');
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Category not found');
  }

  private rethrowSkuConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('A product with this SKU already exists');
    }
    throw e;
  }
}
