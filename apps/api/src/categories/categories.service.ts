import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryDto } from './dto/category.dto';

const categorySelect = {
  id: true,
  name: true,
  parentId: true,
  createdAt: true,
} satisfies Prisma.CategorySelect;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    if (dto.parentId) await this.ensureParentExists(dto.parentId);
    return this.prisma.category.create({ data: dto, select: categorySelect });
  }

  list(): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({
      select: categorySelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<CategoryDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    await this.ensureExists(id);
    // parentId can be a string (re-parent) or null (make root); only a real
    // id needs the self-parent / existence / cycle checks.
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.ensureParentExists(dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }
    return this.prisma.category.update({
      where: { id },
      data: dto,
      select: categorySelect,
    });
  }

  async remove(id: string): Promise<CategoryDto> {
    await this.ensureExists(id);
    const children = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (children > 0) {
      throw new ConflictException('Category has child categories');
    }
    const products = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (products > 0) {
      throw new ConflictException('Category has products');
    }
    return this.prisma.category.delete({
      where: { id },
      select: categorySelect,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Category not found');
  }

  private async ensureParentExists(parentId: string): Promise<void> {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) throw new BadRequestException('Parent category not found');
  }

  /**
   * Walks up the parent chain from the proposed new parent; if it reaches the
   * category being moved, the re-parent would form a cycle.
   */
  private async assertNoCycle(id: string, newParentId: string): Promise<void> {
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === id) {
        throw new ConflictException('Re-parenting would create a cycle');
      }
      const node: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = node?.parentId ?? null;
    }
  }
}
