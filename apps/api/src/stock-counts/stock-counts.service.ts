import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, StockCountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { WarehouseScope } from '../auth/auth.types';
import { assertWarehouseInScope, warehouseFilter } from '../auth/scope.helpers';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { EnterCountsDto } from './dto/enter-counts.dto';
import { StockCountDto } from './dto/stock-count.dto';

const countInclude = {
  warehouse: { select: { name: true } },
  createdBy: { select: { name: true } },
  reconciledBy: { select: { name: true } },
  lines: {
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { product: { name: 'asc' } },
  },
} satisfies Prisma.StockCountInclude;

type CountRow = Prisma.StockCountGetPayload<{ include: typeof countInclude }>;

@Injectable()
export class StockCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly activity: ActivityService,
  ) {}

  private formatCode(n: number): string {
    return `SC-${String(n).padStart(5, '0')}`;
  }

  private toDto(c: CountRow): StockCountDto {
    return {
      id: c.id,
      code: this.formatCode(c.number),
      warehouseId: c.warehouseId,
      warehouseName: c.warehouse.name,
      status: c.status,
      notes: c.notes,
      lines: c.lines.map((l) => ({
        productId: l.productId,
        productName: l.product.name,
        sku: l.product.sku,
        recordedQty: l.recordedQty,
        countedQty: l.countedQty,
        variance: l.countedQty === null ? null : l.countedQty - l.recordedQty,
      })),
      createdByName: c.createdBy?.name ?? null,
      reconciledByName: c.reconciledBy?.name ?? null,
      reconciledAt: c.reconciledAt,
      createdAt: c.createdAt,
    };
  }

  async create(
    scope: WarehouseScope,
    userId: string,
    dto: CreateStockCountDto,
  ): Promise<StockCountDto> {
    assertWarehouseInScope(scope, dto.warehouseId);
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
      select: { id: true },
    });
    if (!warehouse) throw new BadRequestException('Warehouse not found');

    // Snapshot system available for every inventory item in the warehouse.
    const items = await this.prisma.inventoryItem.findMany({
      where: { warehouseId: dto.warehouseId },
      select: { productId: true, available: true },
    });

    const created = await this.prisma.stockCount.create({
      data: {
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        createdById: userId,
        lines: {
          create: items.map((i) => ({
            productId: i.productId,
            recordedQty: i.available,
          })),
        },
      },
      include: countInclude,
    });
    await this.activity.record({
      userId,
      action: 'COUNT_CREATE',
      entityType: 'StockCount',
      entityId: created.id,
      warehouseId: created.warehouseId,
      summary: `Opened count ${this.formatCode(created.number)} at ${created.warehouse.name}`,
    });
    return this.toDto(created);
  }

  async list(
    scope: WarehouseScope,
    opts?: { status?: StockCountStatus; warehouseId?: string },
  ): Promise<StockCountDto[]> {
    const rows = await this.prisma.stockCount.findMany({
      where: {
        // Intersect scope with any explicit warehouse filter (no clobber).
        AND: [
          warehouseFilter(scope, 'warehouseId'),
          ...(opts?.warehouseId ? [{ warehouseId: opts.warehouseId }] : []),
        ],
        ...(opts?.status ? { status: opts.status } : {}),
      },
      include: countInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(scope: WarehouseScope, id: string): Promise<StockCountDto> {
    return this.toDto(await this.loadInScope(scope, id));
  }

  async enterCounts(
    scope: WarehouseScope,
    id: string,
    dto: EnterCountsDto,
  ): Promise<StockCountDto> {
    const count = await this.loadInScope(scope, id);
    assertWarehouseInScope(scope, count.warehouseId);
    this.assertStatus(count.status, 'count');

    const lineProductIds = new Set(count.lines.map((l) => l.productId));
    for (const e of dto.entries) {
      if (!lineProductIds.has(e.productId)) {
        throw new BadRequestException(
          `Product ${e.productId} is not part of this count`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const e of dto.entries) {
        await tx.stockCountLine.update({
          where: {
            stockCountId_productId: {
              stockCountId: id,
              productId: e.productId,
            },
          },
          data: { countedQty: e.countedQty },
        });
      }
    });
    return this.toDto(await this.loadInScope(scope, id));
  }

  /**
   * Reconcile: for every counted line, write an ADJUSTMENT movement bringing the
   * item's available to the physically counted quantity (delta computed from the
   * CURRENT available, not the stale snapshot). All adjustments + the status
   * change commit in one transaction.
   */
  async reconcile(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<StockCountDto> {
    const count = await this.loadInScope(scope, id);
    assertWarehouseInScope(scope, count.warehouseId);
    this.assertStatus(count.status, 'reconcile');

    const counted = count.lines.filter((l) => l.countedQty !== null);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of counted) {
        const item = await tx.inventoryItem.findUnique({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: count.warehouseId,
            },
          },
          select: { available: true },
        });
        const currentAvailable = item?.available ?? 0;
        const delta = (line.countedQty as number) - currentAvailable;
        if (delta !== 0) {
          await this.inventory.applyMovement(
            {
              productId: line.productId,
              warehouseId: count.warehouseId,
              deltas: { available: delta },
              type: MovementType.ADJUSTMENT,
              userId,
              reason: `Stock count ${this.formatCode(count.number)} reconciliation`,
              refType: 'STOCK_COUNT',
              refId: count.id,
            },
            tx,
          );
        }
      }
      return tx.stockCount.update({
        where: { id },
        data: {
          status: StockCountStatus.RECONCILED,
          reconciledById: userId,
          reconciledAt: new Date(),
        },
        include: countInclude,
      });
    });
    await this.activity.record({
      userId,
      action: 'COUNT_RECONCILE',
      entityType: 'StockCount',
      entityId: updated.id,
      warehouseId: updated.warehouseId,
      summary: `Reconciled count ${this.formatCode(updated.number)} (${counted.length} lines)`,
    });
    return this.toDto(updated);
  }

  private async loadInScope(
    scope: WarehouseScope,
    id: string,
  ): Promise<CountRow> {
    const count = await this.prisma.stockCount.findFirst({
      where: { AND: [{ id }, warehouseFilter(scope, 'warehouseId')] },
      include: countInclude,
    });
    if (!count) throw new NotFoundException('Stock count not found');
    return count;
  }

  private assertStatus(current: StockCountStatus, action: string): void {
    if (current !== StockCountStatus.OPEN) {
      throw new ConflictException(
        `A ${current} stock count cannot accept ${action}`,
      );
    }
  }
}
