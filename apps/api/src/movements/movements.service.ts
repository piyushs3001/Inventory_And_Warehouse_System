import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { warehouseFilter } from '../auth/scope.helpers';
import { MovementListDto, StockMovementDto } from './dto/stock-movement.dto';

export interface ListMovementsOptions {
  productId?: string;
  warehouseId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

const movementInclude = {
  inventoryItem: {
    select: {
      product: { select: { name: true, sku: true } },
      warehouse: { select: { name: true } },
    },
  },
  user: { select: { name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementRow = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(m: MovementRow): StockMovementDto {
    return {
      id: m.id,
      productId: m.productId,
      productName: m.inventoryItem.product.name,
      sku: m.inventoryItem.product.sku,
      warehouseId: m.warehouseId,
      warehouseName: m.inventoryItem.warehouse.name,
      type: m.type,
      availableDelta: m.availableDelta,
      reservedDelta: m.reservedDelta,
      damagedDelta: m.damagedDelta,
      inTransitDelta: m.inTransitDelta,
      beforeQty: m.beforeQty,
      afterQty: m.afterQty,
      reason: m.reason,
      refType: m.refType,
      refId: m.refId,
      userId: m.userId,
      userName: m.user?.name ?? null,
      createdAt: m.createdAt,
    };
  }

  async list(
    scope: WarehouseScope,
    opts: ListMovementsOptions,
  ): Promise<MovementListDto> {
    const createdAt = this.dateRange(opts.from, opts.to);
    const where: Prisma.StockMovementWhereInput = {
      // Intersect scope with any explicit warehouse filter (no clobber).
      AND: [
        warehouseFilter(scope, 'warehouseId'),
        ...(opts.warehouseId ? [{ warehouseId: opts.warehouseId }] : []),
      ],
      ...(opts.productId ? { productId: opts.productId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toDto(r)),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  private dateRange(
    from?: string,
    to?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('Invalid "from" date');
      }
      filter.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('Invalid "to" date');
      }
      filter.lte = d;
    }
    return filter;
  }
}
