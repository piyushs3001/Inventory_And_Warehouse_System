import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  PurchaseOrderStatus,
  StockTransferStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { warehouseFilter } from '../auth/scope.helpers';
import { DashboardDto } from './dto/dashboard.dto';

const itemSelect = {
  productId: true,
  available: true,
  reserved: true,
  damaged: true,
  inTransit: true,
  product: {
    select: { name: true, sku: true, costPrice: true, reorderLevel: true },
  },
} satisfies Prisma.InventoryItemSelect;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(scope: WarehouseScope): Promise<DashboardDto> {
    const invWhere: Prisma.InventoryItemWhereInput = warehouseFilter(
      scope,
      'warehouseId',
    );
    const poScope = warehouseFilter(scope, 'warehouseId');
    const transferScope = this.transferScope(scope);

    const [
      items,
      totalProducts,
      pendingPurchaseOrders,
      pendingTransfers,
      recent,
    ] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: invWhere,
        select: itemSelect,
      }),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.purchaseOrder.count({
        where: {
          ...poScope,
          status: {
            in: [
              PurchaseOrderStatus.SENT,
              PurchaseOrderStatus.APPROVED,
              PurchaseOrderStatus.PARTIALLY_RECEIVED,
            ],
          },
        },
      }),
      this.prisma.stockTransfer.count({
        where: {
          ...transferScope,
          status: {
            in: [StockTransferStatus.REQUESTED, StockTransferStatus.APPROVED],
          },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: warehouseFilter(scope, 'warehouseId'),
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          inventoryItem: {
            select: {
              product: { select: { name: true, sku: true } },
              warehouse: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    let totalStockUnits = 0;
    let lowStockCount = 0;
    let stockValue = new Prisma.Decimal(0);
    const byProduct = new Map<
      string,
      { name: string; sku: string; units: number; value: Prisma.Decimal }
    >();

    for (const it of items) {
      const onHand = it.available + it.reserved + it.damaged + it.inTransit;
      totalStockUnits += onHand;
      if (
        it.product.reorderLevel > 0 &&
        it.available <= it.product.reorderLevel
      ) {
        lowStockCount += 1;
      }
      const lineValue = it.product.costPrice.mul(it.available);
      stockValue = stockValue.add(lineValue);

      const agg = byProduct.get(it.productId) ?? {
        name: it.product.name,
        sku: it.product.sku,
        units: 0,
        value: new Prisma.Decimal(0),
      };
      agg.units += it.available;
      agg.value = agg.value.add(lineValue);
      byProduct.set(it.productId, agg);
    }

    const topProducts = [...byProduct.entries()]
      .map(([productId, v]) => ({
        productId,
        name: v.name,
        sku: v.sku,
        units: v.units,
        value: v.value,
      }))
      .sort((a, b) => b.value.comparedTo(a.value))
      .slice(0, 5)
      .map((p) => ({ ...p, value: p.value.toFixed(2) }));

    return {
      totalProducts,
      totalStockUnits,
      stockValue: stockValue.toFixed(2),
      lowStockCount,
      pendingPurchaseOrders,
      pendingTransfers,
      recentMovements: recent.map((m) => ({
        id: m.id,
        type: m.type,
        productName: m.inventoryItem.product.name,
        sku: m.inventoryItem.product.sku,
        warehouseName: m.inventoryItem.warehouse.name,
        afterQty: m.afterQty,
        createdAt: m.createdAt,
      })),
      topProducts,
    };
  }

  private transferScope(scope: WarehouseScope): Prisma.StockTransferWhereInput {
    if (scope.isGlobal) return {};
    return {
      OR: [
        { sourceWarehouseId: { in: scope.warehouseIds } },
        { destinationWarehouseId: { in: scope.warehouseIds } },
      ],
    };
  }
}
