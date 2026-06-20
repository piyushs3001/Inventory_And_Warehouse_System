import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { assertWarehouseInScope, warehouseFilter } from '../auth/scope.helpers';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdjustStockDto, AdjustableBucket } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryItemDto, InventoryListDto } from './dto/inventory-item.dto';

/** Signed change per bucket; omitted buckets are unchanged. */
export interface BucketDeltas {
  available?: number;
  reserved?: number;
  damaged?: number;
  inTransit?: number;
}

export interface ApplyMovementParams {
  productId: string;
  warehouseId: string;
  deltas: BucketDeltas;
  type: MovementType;
  userId: string;
  reason?: string | null;
  refType?: string | null;
  refId?: string | null;
}

interface ListInventoryOptions {
  warehouseId?: string;
  productId?: string;
  search?: string;
  lowStockOnly?: boolean;
  page: number;
  pageSize: number;
}

const itemInclude = {
  product: { select: { name: true, sku: true, reorderLevel: true } },
  warehouse: { select: { name: true } },
} satisfies Prisma.InventoryItemInclude;

type ItemWithRefs = Prisma.InventoryItemGetPayload<{
  include: typeof itemInclude;
}>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  private toDto(item: ItemWithRefs): InventoryItemDto {
    const total =
      item.available + item.reserved + item.damaged + item.inTransit;
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      available: item.available,
      reserved: item.reserved,
      damaged: item.damaged,
      inTransit: item.inTransit,
      total,
      reorderLevel: item.product.reorderLevel,
      lowStock:
        item.product.reorderLevel > 0 &&
        item.available <= item.product.reorderLevel,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Atomically apply signed bucket deltas to one (product x warehouse) item AND
   * write the matching StockMovement — both in the SAME transaction. This is the
   * ONLY sanctioned path for changing stock; reserve/adjust here and the
   * procurement/transfer flows all funnel through it so no quantity ever changes
   * without a ledger row. Pass a transaction client `tx` when composing with
   * other writes; otherwise it opens its own transaction.
   *
   * Fails closed: a delta that would drive any bucket below zero throws and
   * rolls the whole thing back.
   */
  async applyMovement(
    params: ApplyMovementParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ItemWithRefs> {
    if (tx) return this.applyMovementInTx(tx, params);
    return this.prisma.$transaction((client) =>
      this.applyMovementInTx(client, params),
    );
  }

  private async applyMovementInTx(
    tx: Prisma.TransactionClient,
    params: ApplyMovementParams,
  ): Promise<ItemWithRefs> {
    const { productId, warehouseId, deltas, type, userId } = params;

    const existing = await tx.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    const before = existing ?? {
      available: 0,
      reserved: 0,
      damaged: 0,
      inTransit: 0,
    };

    const after = {
      available: before.available + (deltas.available ?? 0),
      reserved: before.reserved + (deltas.reserved ?? 0),
      damaged: before.damaged + (deltas.damaged ?? 0),
      inTransit: before.inTransit + (deltas.inTransit ?? 0),
    };

    if (
      after.available < 0 ||
      after.reserved < 0 ||
      after.damaged < 0 ||
      after.inTransit < 0
    ) {
      throw new BadRequestException(
        'Insufficient stock: the change would drive a bucket below zero',
      );
    }

    const beforeTotal =
      before.available + before.reserved + before.damaged + before.inTransit;
    const afterTotal =
      after.available + after.reserved + after.damaged + after.inTransit;

    const item = await tx.inventoryItem.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: { productId, warehouseId, ...after },
      update: after,
      include: itemInclude,
    });

    await tx.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        productId,
        warehouseId,
        type,
        availableDelta: deltas.available ?? 0,
        reservedDelta: deltas.reserved ?? 0,
        damagedDelta: deltas.damaged ?? 0,
        inTransitDelta: deltas.inTransit ?? 0,
        beforeQty: beforeTotal,
        afterQty: afterTotal,
        reason: params.reason ?? null,
        refType: params.refType ?? null,
        refId: params.refId ?? null,
        userId,
      },
    });

    // Pair every quantity change with an ActivityLog in the same transaction
    // (the StockMovement covers quantity; ActivityLog covers the action trail).
    await this.activity.record(
      {
        userId,
        action: `STOCK_${type}`,
        entityType: 'InventoryItem',
        entityId: item.id,
        warehouseId,
        summary: `${type} ${item.product.sku} at ${item.warehouse.name} (${beforeTotal}→${afterTotal})`,
        before,
        after,
      },
      tx,
    );

    // Low-stock alert on the downward crossing of the reorder threshold.
    const reorder = item.product.reorderLevel;
    if (
      reorder > 0 &&
      before.available > reorder &&
      after.available <= reorder
    ) {
      await this.notifications.notifyWarehouseOverseers(
        warehouseId,
        {
          type: 'LOW_STOCK',
          title: `Low stock: ${item.product.name}`,
          body: `${item.warehouse.name}: ${after.available} available (reorder at ${reorder}).`,
          link: '/inventory',
        },
        tx,
      );
    }

    return item;
  }

  async list(
    scope: WarehouseScope,
    opts: ListInventoryOptions,
  ): Promise<InventoryListDto> {
    const where: Prisma.InventoryItemWhereInput = {
      // Scope filter AND any explicit warehouse filter — intersect, never let
      // the explicit value clobber the scope `in`-filter (would bypass scope).
      AND: [
        warehouseFilter(scope, 'warehouseId'),
        ...(opts.warehouseId ? [{ warehouseId: opts.warehouseId }] : []),
      ],
      ...(opts.productId ? { productId: opts.productId } : {}),
      ...(opts.search
        ? {
            product: {
              OR: [
                { name: { contains: opts.search, mode: 'insensitive' } },
                { sku: { contains: opts.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const orderBy: Prisma.InventoryItemOrderByWithRelationInput[] = [
      { product: { name: 'asc' } },
      { warehouseId: 'asc' },
    ];
    const skip = (opts.page - 1) * opts.pageSize;

    // Low-stock = available <= product.reorderLevel (reorderLevel > 0). Prisma
    // can't compare two columns in a `where`, so for this filter we resolve the
    // matching ids in a lightweight pass (id + the two compared numbers), then
    // paginate that id set — this keeps `total` and the returned page honest,
    // unlike filtering after pagination.
    if (opts.lowStockOnly) {
      const candidates = await this.prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          available: true,
          product: { select: { reorderLevel: true } },
        },
        orderBy,
      });
      const lowIds = candidates
        .filter(
          (c) =>
            c.product.reorderLevel > 0 && c.available <= c.product.reorderLevel,
        )
        .map((c) => c.id);
      const pageIds = lowIds.slice(skip, skip + opts.pageSize);
      const rows = await this.prisma.inventoryItem.findMany({
        where: { id: { in: pageIds } },
        include: itemInclude,
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      return {
        data: pageIds.map((id) => this.toDto(byId.get(id)!)),
        total: lowIds.length,
        page: opts.page,
        pageSize: opts.pageSize,
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        include: itemInclude,
        orderBy,
        skip,
        take: opts.pageSize,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toDto(r)),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  async adjust(
    scope: WarehouseScope,
    userId: string,
    dto: AdjustStockDto,
  ): Promise<InventoryItemDto> {
    assertWarehouseInScope(scope, dto.warehouseId);
    if (dto.delta === 0) {
      throw new BadRequestException('Adjustment delta must be non-zero');
    }
    const deltas: BucketDeltas =
      dto.bucket === AdjustableBucket.AVAILABLE
        ? { available: dto.delta }
        : { damaged: dto.delta };

    const item = await this.applyMovement({
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      deltas,
      type: MovementType.ADJUSTMENT,
      userId,
      reason: dto.reason,
    });
    return this.toDto(item);
  }

  async reserve(
    scope: WarehouseScope,
    userId: string,
    dto: ReserveStockDto,
  ): Promise<InventoryItemDto> {
    assertWarehouseInScope(scope, dto.warehouseId);
    const item = await this.applyMovement({
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      deltas: { available: -dto.quantity, reserved: dto.quantity },
      type: MovementType.ADJUSTMENT,
      userId,
      reason: dto.reason ? `Reservation: ${dto.reason}` : 'Reservation',
    });
    return this.toDto(item);
  }
}
