import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseScope } from '../auth/auth.types';
import { warehouseFilter } from '../auth/scope.helpers';
import { ReportColumnDto, ReportDto } from './dto/report.dto';

export type ReportType = 'inventory' | 'purchase' | 'warehouse';
const TYPES: ReportType[] = ['inventory', 'purchase', 'warehouse'];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  parseType(raw: string): ReportType {
    if (!TYPES.includes(raw as ReportType)) {
      throw new BadRequestException(
        `Unknown report type: ${raw} (expected one of ${TYPES.join(', ')})`,
      );
    }
    return raw as ReportType;
  }

  async build(type: ReportType, scope: WarehouseScope): Promise<ReportDto> {
    const now = new Date();
    switch (type) {
      case 'inventory':
        return { type, generatedAt: now, ...(await this.inventory(scope)) };
      case 'purchase':
        return { type, generatedAt: now, ...(await this.purchase(scope)) };
      case 'warehouse':
        return { type, generatedAt: now, ...(await this.warehouse(scope)) };
    }
  }

  private async inventory(scope: WarehouseScope) {
    const items = await this.prisma.inventoryItem.findMany({
      where: warehouseFilter(scope, 'warehouseId'),
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            costPrice: true,
            reorderLevel: true,
          },
        },
        warehouse: { select: { name: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });
    let totalUnits = 0;
    let totalValue = new Prisma.Decimal(0);
    let lowStock = 0;
    const rows = items.map((it) => {
      const total = it.available + it.reserved + it.damaged + it.inTransit;
      const value = it.product.costPrice.mul(it.available);
      const low =
        it.product.reorderLevel > 0 && it.available <= it.product.reorderLevel;
      totalUnits += total;
      totalValue = totalValue.add(value);
      if (low) lowStock += 1;
      return {
        warehouse: it.warehouse.name,
        product: it.product.name,
        sku: it.product.sku,
        available: it.available,
        reserved: it.reserved,
        damaged: it.damaged,
        inTransit: it.inTransit,
        total,
        reorderLevel: it.product.reorderLevel,
        lowStock: low ? 'yes' : 'no',
        stockValue: value.toFixed(2),
      };
    });
    const columns: ReportColumnDto[] = [
      { key: 'warehouse', label: 'Warehouse', numeric: false },
      { key: 'product', label: 'Product', numeric: false },
      { key: 'sku', label: 'SKU', numeric: false },
      { key: 'available', label: 'Available', numeric: true },
      { key: 'reserved', label: 'Reserved', numeric: true },
      { key: 'damaged', label: 'Damaged', numeric: true },
      { key: 'inTransit', label: 'In transit', numeric: true },
      { key: 'total', label: 'Total', numeric: true },
      { key: 'reorderLevel', label: 'Reorder', numeric: true },
      { key: 'lowStock', label: 'Low?', numeric: false },
      { key: 'stockValue', label: 'Stock value', numeric: true },
    ];
    return {
      columns,
      rows,
      summary: {
        Items: rows.length,
        'Total units': totalUnits,
        'Low-stock items': lowStock,
        'Total stock value': totalValue.toFixed(2),
      },
    };
  }

  private async purchase(scope: WarehouseScope) {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: warehouseFilter(scope, 'warehouseId'),
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
        lines: {
          select: {
            quantity: true,
            unitCost: true,
            receivedQty: true,
            damagedQty: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    let grandTotal = new Prisma.Decimal(0);
    const rows = pos.map((po) => {
      let cost = new Prisma.Decimal(0);
      let ordered = 0;
      let received = 0;
      let damaged = 0;
      for (const l of po.lines) {
        cost = cost.add(l.unitCost.mul(l.quantity));
        ordered += l.quantity;
        received += l.receivedQty;
        damaged += l.damagedQty;
      }
      grandTotal = grandTotal.add(cost);
      return {
        code: `PO-${String(po.number).padStart(5, '0')}`,
        supplier: po.supplier.name,
        warehouse: po.warehouse.name,
        status: po.status,
        lines: po.lines.length,
        ordered,
        received,
        damaged,
        totalCost: cost.toFixed(2),
      };
    });
    const columns: ReportColumnDto[] = [
      { key: 'code', label: 'PO', numeric: false },
      { key: 'supplier', label: 'Supplier', numeric: false },
      { key: 'warehouse', label: 'Warehouse', numeric: false },
      { key: 'status', label: 'Status', numeric: false },
      { key: 'lines', label: 'Lines', numeric: true },
      { key: 'ordered', label: 'Ordered', numeric: true },
      { key: 'received', label: 'Received', numeric: true },
      { key: 'damaged', label: 'Damaged', numeric: true },
      { key: 'totalCost', label: 'Total cost', numeric: true },
    ];
    return {
      columns,
      rows,
      summary: {
        'Purchase orders': rows.length,
        'Total purchase value': grandTotal.toFixed(2),
      },
    };
  }

  private async warehouse(scope: WarehouseScope) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { ...warehouseFilter(scope, 'id'), status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        inventoryItems: {
          select: {
            available: true,
            reserved: true,
            damaged: true,
            inTransit: true,
            product: { select: { costPrice: true, reorderLevel: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    let grandValue = new Prisma.Decimal(0);
    const rows = warehouses.map((w) => {
      let units = 0;
      let value = new Prisma.Decimal(0);
      let low = 0;
      for (const it of w.inventoryItems) {
        units += it.available + it.reserved + it.damaged + it.inTransit;
        value = value.add(it.product.costPrice.mul(it.available));
        if (
          it.product.reorderLevel > 0 &&
          it.available <= it.product.reorderLevel
        )
          low += 1;
      }
      grandValue = grandValue.add(value);
      return {
        warehouse: w.name,
        products: w.inventoryItems.length,
        units,
        lowStockItems: low,
        stockValue: value.toFixed(2),
      };
    });
    const columns: ReportColumnDto[] = [
      { key: 'warehouse', label: 'Warehouse', numeric: false },
      { key: 'products', label: 'Products', numeric: true },
      { key: 'units', label: 'Units', numeric: true },
      { key: 'lowStockItems', label: 'Low-stock items', numeric: true },
      { key: 'stockValue', label: 'Stock value', numeric: true },
    ];
    return {
      columns,
      rows,
      summary: {
        Warehouses: rows.length,
        'Total stock value': grandValue.toFixed(2),
      },
    };
  }

  toCsv(report: ReportDto): string {
    const esc = (v: string | number): string => {
      let s = String(v);
      // Neutralize spreadsheet formula injection: a cell starting with = + - @
      // (or tab/CR) is treated as a formula by Excel/Sheets. Prefix with an
      // apostrophe so user-controlled names (product/warehouse) can't execute.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = report.columns.map((c) => esc(c.label)).join(',');
    const body = report.rows
      .map((row) => report.columns.map((c) => esc(row[c.key] ?? '')).join(','))
      .join('\n');
    return `${header}\n${body}`;
  }
}
