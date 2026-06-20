import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { WarehouseScope } from '../auth/auth.types';
import { assertWarehouseInScope } from '../auth/scope.helpers';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferDto } from './dto/transfer.dto';

const transferInclude = {
  sourceWarehouse: { select: { name: true } },
  destinationWarehouse: { select: { name: true } },
  requestedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
  receivedBy: { select: { name: true } },
  lines: {
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { product: { name: 'asc' } },
  },
} satisfies Prisma.StockTransferInclude;

type TransferRow = Prisma.StockTransferGetPayload<{
  include: typeof transferInclude;
}>;

interface ListTransferOptions {
  status?: StockTransferStatus;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly activity: ActivityService,
  ) {}

  private formatCode(n: number): string {
    return `TR-${String(n).padStart(5, '0')}`;
  }

  private logTransfer(
    userId: string,
    action: string,
    t: { id: string; number: number; sourceWarehouseId: string },
    summary: string,
  ): Promise<void> {
    return this.activity.record({
      userId,
      action,
      entityType: 'StockTransfer',
      entityId: t.id,
      warehouseId: t.sourceWarehouseId,
      summary,
    });
  }

  private toDto(t: TransferRow): TransferDto {
    return {
      id: t.id,
      code: this.formatCode(t.number),
      sourceWarehouseId: t.sourceWarehouseId,
      sourceWarehouseName: t.sourceWarehouse.name,
      destinationWarehouseId: t.destinationWarehouseId,
      destinationWarehouseName: t.destinationWarehouse.name,
      status: t.status,
      notes: t.notes,
      lines: t.lines.map((l) => ({
        productId: l.productId,
        productName: l.product.name,
        sku: l.product.sku,
        quantity: l.quantity,
      })),
      requestedByName: t.requestedBy?.name ?? null,
      approvedByName: t.approvedBy?.name ?? null,
      receivedByName: t.receivedBy?.name ?? null,
      approvedAt: t.approvedAt,
      receivedAt: t.receivedAt,
      createdAt: t.createdAt,
    };
  }

  // A transfer is visible if the caller has scope over EITHER endpoint.
  private scopeWhere(scope: WarehouseScope): Prisma.StockTransferWhereInput {
    if (scope.isGlobal) return {};
    return {
      OR: [
        { sourceWarehouseId: { in: scope.warehouseIds } },
        { destinationWarehouseId: { in: scope.warehouseIds } },
      ],
    };
  }

  async create(
    scope: WarehouseScope,
    userId: string,
    dto: CreateTransferDto,
  ): Promise<TransferDto> {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException('Source and destination must differ');
    }
    // Moving stock OUT of the source — requires scope over the source.
    assertWarehouseInScope(scope, dto.sourceWarehouseId);
    await this.ensureWarehouseExists(dto.sourceWarehouseId);
    await this.ensureWarehouseExists(dto.destinationWarehouseId);
    this.assertNoDuplicateProducts(dto.lines.map((l) => l.productId));
    await this.ensureProductsExist(dto.lines.map((l) => l.productId));

    const transfer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          notes: dto.notes,
          requestedById: userId,
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
            })),
          },
        },
        include: transferInclude,
      });
      // Hold the stock: source available -> inTransit (fails closed if short).
      for (const l of dto.lines) {
        await this.inventory.applyMovement(
          {
            productId: l.productId,
            warehouseId: dto.sourceWarehouseId,
            deltas: { available: -l.quantity, inTransit: l.quantity },
            type: MovementType.TRANSFER,
            userId,
            reason: `Transfer out ${this.formatCode(created.number)}`,
            refType: 'STOCK_TRANSFER',
            refId: created.id,
          },
          tx,
        );
      }
      return created;
    });
    await this.logTransfer(
      userId,
      'TRANSFER_REQUEST',
      transfer,
      `Requested ${this.formatCode(transfer.number)}: ${transfer.sourceWarehouse.name} → ${transfer.destinationWarehouse.name}`,
    );
    return this.toDto(transfer);
  }

  async list(
    scope: WarehouseScope,
    opts?: ListTransferOptions,
  ): Promise<TransferDto[]> {
    const rows = await this.prisma.stockTransfer.findMany({
      where: {
        ...this.scopeWhere(scope),
        ...(opts?.status ? { status: opts.status } : {}),
      },
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(scope: WarehouseScope, id: string): Promise<TransferDto> {
    return this.toDto(await this.loadVisible(scope, id));
  }

  async approve(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<TransferDto> {
    const t = await this.loadVisible(scope, id);
    assertWarehouseInScope(scope, t.sourceWarehouseId);
    this.assertStatus(t.status, [StockTransferStatus.REQUESTED], 'approved');
    const updated = await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.APPROVED, approvedAt: new Date() },
      include: transferInclude,
    });
    await this.logTransfer(
      userId,
      'TRANSFER_APPROVE',
      updated,
      `Approved ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  /** Cancel a REQUESTED/APPROVED transfer: release the in-transit hold back to source available. */
  async cancel(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<TransferDto> {
    const t = await this.loadVisible(scope, id);
    assertWarehouseInScope(scope, t.sourceWarehouseId);
    this.assertStatus(
      t.status,
      [StockTransferStatus.REQUESTED, StockTransferStatus.APPROVED],
      'cancelled',
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      // Optimistic status lock: flip the status FIRST, gated on the expected
      // state. If a concurrent cancel/receive already moved it, count===0 and we
      // abort before touching stock (prevents a double release / release+land).
      const lock = await tx.stockTransfer.updateMany({
        where: {
          id,
          status: {
            in: [StockTransferStatus.REQUESTED, StockTransferStatus.APPROVED],
          },
        },
        data: { status: StockTransferStatus.CANCELLED },
      });
      if (lock.count !== 1) {
        throw new ConflictException('Transfer is no longer cancellable');
      }
      for (const l of t.lines) {
        await this.inventory.applyMovement(
          {
            productId: l.productId,
            warehouseId: t.sourceWarehouseId,
            deltas: { inTransit: -l.quantity, available: l.quantity },
            type: MovementType.TRANSFER,
            userId,
            reason: `Transfer cancelled ${this.formatCode(t.number)}`,
            refType: 'STOCK_TRANSFER',
            refId: t.id,
          },
          tx,
        );
      }
      return tx.stockTransfer.findUniqueOrThrow({
        where: { id },
        include: transferInclude,
      });
    });
    await this.logTransfer(
      userId,
      'TRANSFER_CANCEL',
      updated,
      `Cancelled ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  /** Receive an approved transfer at the destination: source inTransit cleared, destination available up. */
  async receive(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<TransferDto> {
    const t = await this.loadVisible(scope, id);
    // Receiving INTO the destination — requires scope over the destination.
    assertWarehouseInScope(scope, t.destinationWarehouseId);
    this.assertStatus(t.status, [StockTransferStatus.APPROVED], 'received');
    const updated = await this.prisma.$transaction(async (tx) => {
      // Optimistic status lock: only one receive can flip APPROVED→COMPLETED;
      // a concurrent receive matches 0 rows and aborts before moving any stock.
      const lock = await tx.stockTransfer.updateMany({
        where: { id, status: StockTransferStatus.APPROVED },
        data: {
          status: StockTransferStatus.COMPLETED,
          receivedById: userId,
          receivedAt: new Date(),
        },
      });
      if (lock.count !== 1) {
        throw new ConflictException('Transfer is no longer awaiting receipt');
      }
      for (const l of t.lines) {
        // Clear the hold on the source.
        await this.inventory.applyMovement(
          {
            productId: l.productId,
            warehouseId: t.sourceWarehouseId,
            deltas: { inTransit: -l.quantity },
            type: MovementType.TRANSFER,
            userId,
            reason: `Transfer out received ${this.formatCode(t.number)}`,
            refType: 'STOCK_TRANSFER',
            refId: t.id,
          },
          tx,
        );
        // Land it at the destination.
        await this.inventory.applyMovement(
          {
            productId: l.productId,
            warehouseId: t.destinationWarehouseId,
            deltas: { available: l.quantity },
            type: MovementType.TRANSFER,
            userId,
            reason: `Transfer in ${this.formatCode(t.number)}`,
            refType: 'STOCK_TRANSFER',
            refId: t.id,
          },
          tx,
        );
      }
      return tx.stockTransfer.findUniqueOrThrow({
        where: { id },
        include: transferInclude,
      });
    });
    await this.logTransfer(
      userId,
      'TRANSFER_RECEIVE',
      updated,
      `Received ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  // ---- helpers ----

  private async loadVisible(
    scope: WarehouseScope,
    id: string,
  ): Promise<TransferRow> {
    const t = await this.prisma.stockTransfer.findFirst({
      where: { AND: [{ id }, this.scopeWhere(scope)] },
      include: transferInclude,
    });
    if (!t) throw new NotFoundException('Transfer not found');
    return t;
  }

  private assertStatus(
    current: StockTransferStatus,
    allowed: StockTransferStatus[],
    action: string,
  ): void {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `A transfer in ${current} cannot be ${action}`,
      );
    }
  }

  private assertNoDuplicateProducts(productIds: string[]): void {
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate product in transfer lines');
    }
  }

  private async ensureWarehouseExists(warehouseId: string): Promise<void> {
    const found = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true },
    });
    if (!found) throw new BadRequestException('Warehouse not found');
  }

  private async ensureProductsExist(productIds: string[]): Promise<void> {
    const found = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (found.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products do not exist');
    }
  }
}
