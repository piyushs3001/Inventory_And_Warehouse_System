import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WarehouseScope } from '../auth/auth.types';
import { assertWarehouseInScope, warehouseFilter } from '../auth/scope.helpers';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { PurchaseOrderDto } from './dto/purchase-order.dto';
import { GoodsReceiptDto } from './dto/goods-receipt.dto';

const poInclude = {
  supplier: { select: { name: true } },
  warehouse: { select: { name: true } },
  createdBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
  lines: {
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { product: { name: 'asc' } },
  },
} satisfies Prisma.PurchaseOrderInclude;

type PoRow = Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>;

const receiptInclude = {
  receivedBy: { select: { name: true } },
  lines: { include: { product: { select: { name: true, sku: true } } } },
} satisfies Prisma.GoodsReceiptInclude;

type ReceiptRow = Prisma.GoodsReceiptGetPayload<{
  include: typeof receiptInclude;
}>;

interface ListPoOptions {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  private logPo(
    userId: string,
    action: string,
    po: { id: string; number: number; warehouseId: string },
    summary: string,
  ): Promise<void> {
    return this.activity.record({
      userId,
      action,
      entityType: 'PurchaseOrder',
      entityId: po.id,
      warehouseId: po.warehouseId,
      summary,
    });
  }

  private formatCode(n: number): string {
    return `PO-${String(n).padStart(5, '0')}`;
  }

  private toDto(po: PoRow): PurchaseOrderDto {
    let total = new Prisma.Decimal(0);
    for (const line of po.lines) {
      total = total.add(line.unitCost.mul(line.quantity));
    }
    return {
      id: po.id,
      code: this.formatCode(po.number),
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      warehouseId: po.warehouseId,
      warehouseName: po.warehouse.name,
      status: po.status,
      expectedDate: po.expectedDate,
      notes: po.notes,
      lines: po.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product.name,
        sku: l.product.sku,
        quantity: l.quantity,
        unitCost: l.unitCost.toFixed(2),
        receivedQty: l.receivedQty,
        damagedQty: l.damagedQty,
        // Remaining capacity: units neither received sound nor recorded damaged.
        // No-over-receipt caps (sound + damaged) at the ordered quantity.
        outstandingQty: Math.max(0, l.quantity - l.receivedQty - l.damagedQty),
      })),
      totalCost: total.toFixed(2),
      createdById: po.createdById,
      createdByName: po.createdBy?.name ?? null,
      approvedByName: po.approvedBy?.name ?? null,
      sentAt: po.sentAt,
      approvedAt: po.approvedAt,
      completedAt: po.completedAt,
      createdAt: po.createdAt,
    };
  }

  async create(
    scope: WarehouseScope,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    assertWarehouseInScope(scope, dto.warehouseId);
    await this.ensureSupplierExists(dto.supplierId);
    await this.ensureWarehouseExists(dto.warehouseId);
    this.assertNoDuplicateProducts(dto.lines.map((l) => l.productId));
    await this.ensureProductsExist(dto.lines.map((l) => l.productId));

    // `number` is DB-assigned (autoincrement) — no count()+1 race, no need for a
    // wrapping transaction just to mint the code.
    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        createdById: userId,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        },
      },
      include: poInclude,
    });
    await this.logPo(
      userId,
      'PO_CREATE',
      po,
      `Created ${this.formatCode(po.number)} for ${po.supplier.name}`,
    );
    return this.toDto(po);
  }

  async list(
    scope: WarehouseScope,
    opts?: ListPoOptions,
  ): Promise<PurchaseOrderDto[]> {
    const rows = await this.prisma.purchaseOrder.findMany({
      where: {
        // Intersect scope with any explicit warehouse filter (no clobber).
        AND: [
          warehouseFilter(scope, 'warehouseId'),
          ...(opts?.warehouseId ? [{ warehouseId: opts.warehouseId }] : []),
        ],
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.supplierId ? { supplierId: opts.supplierId } : {}),
      },
      include: poInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(scope: WarehouseScope, id: string): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    return this.toDto(po);
  }

  async update(
    scope: WarehouseScope,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException('Only a draft PO can be edited');
    }
    if (dto.lines) {
      this.assertNoDuplicateProducts(dto.lines.map((l) => l.productId));
      await this.ensureProductsExist(dto.lines.map((l) => l.productId));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id },
        });
        await tx.purchaseOrderLine.createMany({
          data: dto.lines.map((l) => ({
            purchaseOrderId: id,
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        });
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.expectedDate !== undefined
            ? {
                expectedDate: dto.expectedDate
                  ? new Date(dto.expectedDate)
                  : null,
              }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
        include: poInclude,
      });
    });
    return this.toDto(updated);
  }

  async send(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    this.assertStatus(po.status, [PurchaseOrderStatus.DRAFT], 'sent');
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT, sentAt: new Date() },
      include: poInclude,
    });
    const code = this.formatCode(updated.number);
    await this.logPo(
      userId,
      'PO_SEND',
      updated,
      `Sent ${code} to ${updated.supplier.name}`,
    );
    // Alert the warehouse's overseers that a PO awaits approval.
    await this.notifications.notifyWarehouseOverseers(updated.warehouseId, {
      type: 'PO_APPROVAL',
      title: `PO ${code} awaiting approval`,
      body: `${updated.supplier.name} → ${updated.warehouse.name}`,
      link: `/purchase-orders/${updated.id}`,
    });
    return this.toDto(updated);
  }

  async approve(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    this.assertStatus(po.status, [PurchaseOrderStatus.SENT], 'approved');
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: poInclude,
    });
    await this.logPo(
      userId,
      'PO_APPROVE',
      updated,
      `Approved ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  async cancel(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    this.assertStatus(
      po.status,
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT],
      'cancelled',
    );
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: poInclude,
    });
    await this.logPo(
      userId,
      'PO_CANCEL',
      updated,
      `Cancelled ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  /**
   * Receive a delivery against a PO. ATOMIC: the GoodsReceipt + per-line
   * receivedQty/damagedQty + the RECEIVE StockMovement(s) (sound→available,
   * damaged→damaged, via the Phase 3 applyMovement) + the PO status change all
   * commit together or roll back together. No partial receipt.
   */
  async receive(
    scope: WarehouseScope,
    userId: string,
    id: string,
    dto: ReceiveGoodsDto,
  ): Promise<GoodsReceiptDto> {
    const po = await this.loadInScope(scope, id);
    this.assertStatus(
      po.status,
      [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
      'received',
    );

    this.assertNoDuplicateProducts(dto.lines.map((l) => l.productId));
    const lineByProduct = new Map(po.lines.map((l) => [l.productId, l]));
    const meaningful = dto.lines.filter(
      (l) => l.soundQty > 0 || l.damagedQty > 0,
    );
    if (meaningful.length === 0) {
      throw new BadRequestException('A receipt must record at least one unit');
    }
    for (const rl of dto.lines) {
      const line = lineByProduct.get(rl.productId);
      if (!line) {
        throw new BadRequestException(
          `Product ${rl.productId} is not on this purchase order`,
        );
      }
      // No over-receipt: total units accounted for (sound + damaged), across
      // all receipts, may not exceed the ordered quantity. Damaged units are
      // received units too — they count against the cap (just not toward usable
      // stock), so an unbounded damaged qty can't inflate the line.
      const alreadyAccounted = line.receivedQty + line.damagedQty;
      const incoming = rl.soundQty + rl.damagedQty;
      if (alreadyAccounted + incoming > line.quantity) {
        throw new BadRequestException(
          `Over-receipt for ${line.product.sku}: ${alreadyAccounted + incoming} units exceeds ${line.quantity} ordered`,
        );
      }
    }

    const { receipt, newStatus } = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.goodsReceipt.create({
          data: {
            purchaseOrderId: po.id,
            warehouseId: po.warehouseId,
            receivedById: userId,
            deliveryNote: dto.deliveryNote,
            notes: dto.notes,
            lines: {
              create: meaningful.map((l) => ({
                productId: l.productId,
                soundQty: l.soundQty,
                damagedQty: l.damagedQty,
              })),
            },
          },
          include: receiptInclude,
        });

        for (const rl of meaningful) {
          // Re-read inside the transaction and re-check the cap against the
          // CURRENT line totals — two concurrent receipts that each passed the
          // pre-transaction check on stale data can't both over-receive.
          const current = await tx.purchaseOrderLine.findUniqueOrThrow({
            where: {
              purchaseOrderId_productId: {
                purchaseOrderId: po.id,
                productId: rl.productId,
              },
            },
            select: { quantity: true, receivedQty: true, damagedQty: true },
          });
          if (
            current.receivedQty +
              current.damagedQty +
              rl.soundQty +
              rl.damagedQty >
            current.quantity
          ) {
            throw new BadRequestException(
              `Over-receipt for product ${rl.productId}: exceeds ordered quantity`,
            );
          }
          await tx.purchaseOrderLine.update({
            where: {
              purchaseOrderId_productId: {
                purchaseOrderId: po.id,
                productId: rl.productId,
              },
            },
            data: {
              receivedQty: { increment: rl.soundQty },
              damagedQty: { increment: rl.damagedQty },
            },
          });
          await this.inventory.applyMovement(
            {
              productId: rl.productId,
              warehouseId: po.warehouseId,
              deltas: { available: rl.soundQty, damaged: rl.damagedQty },
              type: MovementType.RECEIVE,
              userId,
              reason: `Goods receipt for ${this.formatCode(po.number)}`,
              refType: 'PURCHASE_ORDER',
              refId: po.id,
            },
            tx,
          );
        }

        const updatedLines = await tx.purchaseOrderLine.findMany({
          where: { purchaseOrderId: po.id },
          select: { quantity: true, receivedQty: true, damagedQty: true },
        });
        // Fully reconciled when every unit ordered has been accounted for as
        // sound or damaged (the supplier delivered the whole line).
        const complete = updatedLines.every(
          (l) => l.receivedQty + l.damagedQty >= l.quantity,
        );
        const status = complete
          ? PurchaseOrderStatus.COMPLETED
          : PurchaseOrderStatus.PARTIALLY_RECEIVED;
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status, completedAt: complete ? new Date() : null },
        });
        return { receipt: created, newStatus: status };
      },
    );

    await this.logPo(
      userId,
      'PO_RECEIVE',
      po,
      `Received against ${this.formatCode(po.number)} → ${newStatus}`,
    );
    return this.toReceiptDto(receipt, this.formatCode(po.number), newStatus);
  }

  /**
   * Close out a Partially Received PO that will not be fully delivered (e.g. a
   * supplier short-ship). Marks it Completed without further stock — a manual,
   * role-gated terminal transition so partial POs don't linger forever.
   */
  async close(
    scope: WarehouseScope,
    userId: string,
    id: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.loadInScope(scope, id);
    this.assertStatus(
      po.status,
      [PurchaseOrderStatus.PARTIALLY_RECEIVED],
      'closed',
    );
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.COMPLETED, completedAt: new Date() },
      include: poInclude,
    });
    await this.logPo(
      userId,
      'PO_CLOSE',
      updated,
      `Closed out ${this.formatCode(updated.number)}`,
    );
    return this.toDto(updated);
  }

  async getReceipt(
    scope: WarehouseScope,
    receiptId: string,
  ): Promise<GoodsReceiptDto> {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id: receiptId },
      include: {
        ...receiptInclude,
        purchaseOrder: { select: { number: true, status: true } },
      },
    });
    // Out-of-scope reads return 404 (not 403) so we don't reveal that a receipt
    // for another warehouse exists.
    const inScope =
      scope.isGlobal || scope.warehouseIds.includes(receipt?.warehouseId ?? '');
    if (!receipt || !inScope) {
      throw new NotFoundException('Goods receipt not found');
    }
    return this.toReceiptDto(
      receipt,
      this.formatCode(receipt.purchaseOrder.number),
      receipt.purchaseOrder.status,
    );
  }

  // ---- helpers ----

  private toReceiptDto(
    r: ReceiptRow,
    poCode: string,
    resultingPoStatus: string,
  ): GoodsReceiptDto {
    return {
      id: r.id,
      purchaseOrderId: r.purchaseOrderId,
      poCode,
      warehouseId: r.warehouseId,
      receivedById: r.receivedById,
      receivedByName: r.receivedBy?.name ?? null,
      deliveryNote: r.deliveryNote,
      notes: r.notes,
      resultingPoStatus,
      lines: r.lines.map((l) => ({
        productId: l.productId,
        productName: l.product.name,
        sku: l.product.sku,
        soundQty: l.soundQty,
        damagedQty: l.damagedQty,
      })),
      createdAt: r.createdAt,
    };
  }

  private async loadInScope(scope: WarehouseScope, id: string): Promise<PoRow> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { AND: [{ id }, warehouseFilter(scope, 'warehouseId')] },
      include: poInclude,
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  private assertStatus(
    current: PurchaseOrderStatus,
    allowed: PurchaseOrderStatus[],
    action: string,
  ): void {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `A purchase order in ${current} cannot be ${action}`,
      );
    }
  }

  private assertNoDuplicateProducts(productIds: string[]): void {
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate product in order lines');
    }
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const found = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!found) throw new BadRequestException('Supplier not found');
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
