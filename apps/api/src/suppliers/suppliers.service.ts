import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, SupplierStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierDto } from './dto/supplier.dto';
import { SupplierPerformanceDto } from './dto/supplier-performance.dto';

const supplierSelect = {
  id: true,
  name: true,
  contactName: true,
  email: true,
  phone: true,
  address: true,
  status: true,
  createdAt: true,
} satisfies Prisma.SupplierSelect;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, dto: CreateSupplierDto): Promise<SupplierDto> {
    const created = await this.prisma.supplier.create({
      data: dto,
      select: supplierSelect,
    });
    await this.activity.record({
      userId,
      action: 'SUPPLIER_CREATE',
      entityType: 'Supplier',
      entityId: created.id,
      summary: `Created supplier ${created.name}`,
    });
    return created;
  }

  list(opts?: {
    includeInactive?: boolean;
    search?: string;
  }): Promise<SupplierDto[]> {
    return this.prisma.supplier.findMany({
      where: {
        ...(opts?.includeInactive ? {} : { status: SupplierStatus.ACTIVE }),
        ...(opts?.search
          ? {
              OR: [
                { name: { contains: opts.search, mode: 'insensitive' } },
                { contactName: { contains: opts.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: supplierSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<SupplierDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      select: supplierSelect,
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierDto> {
    await this.ensureExists(id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
      select: supplierSelect,
    });
    await this.activity.record({
      userId,
      action: 'SUPPLIER_UPDATE',
      entityType: 'Supplier',
      entityId: id,
      summary: `Updated supplier ${updated.name}`,
    });
    return updated;
  }

  /** Soft-delete: deactivate. Never hard-delete a supplier with PO history. */
  async deactivate(userId: string, id: string): Promise<SupplierDto> {
    await this.ensureExists(id);
    const deactivated = await this.prisma.supplier.update({
      where: { id },
      data: { status: SupplierStatus.INACTIVE },
      select: supplierSelect,
    });
    await this.activity.record({
      userId,
      action: 'SUPPLIER_DEACTIVATE',
      entityType: 'Supplier',
      entityId: id,
      summary: `Deactivated supplier ${deactivated.name}`,
    });
    return deactivated;
  }

  async performance(id: string): Promise<SupplierPerformanceDto> {
    await this.ensureExists(id);
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id, status: { not: PurchaseOrderStatus.CANCELLED } },
      select: {
        status: true,
        expectedDate: true,
        lines: {
          select: { quantity: true, receivedQty: true, damagedQty: true },
        },
        receipts: { select: { createdAt: true } },
      },
    });

    let unitsOrdered = 0;
    let unitsReceived = 0;
    let unitsDamaged = 0;
    let completedOrders = 0;
    let onTimeEligible = 0;
    let onTime = 0;

    for (const po of orders) {
      for (const line of po.lines) {
        unitsOrdered += line.quantity;
        unitsReceived += line.receivedQty;
        unitsDamaged += line.damagedQty;
      }
      if (po.status === PurchaseOrderStatus.COMPLETED) {
        completedOrders += 1;
        if (po.expectedDate && po.receipts.length > 0) {
          onTimeEligible += 1;
          const lastReceipt = po.receipts.reduce(
            (latest, r) => (r.createdAt > latest ? r.createdAt : latest),
            po.receipts[0].createdAt,
          );
          if (lastReceipt <= po.expectedDate) onTime += 1;
        }
      }
    }

    const ratio = (num: number, den: number): number | null =>
      den === 0 ? null : Math.round((num / den) * 10000) / 10000;

    return {
      supplierId: id,
      totalOrders: orders.length,
      completedOrders,
      unitsOrdered,
      unitsReceived,
      unitsDamaged,
      quantityAccuracy: ratio(unitsReceived, unitsOrdered),
      damageRate: ratio(unitsDamaged, unitsReceived + unitsDamaged),
      onTimeRate: ratio(onTime, onTimeEligible),
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Supplier not found');
  }
}
