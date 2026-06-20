import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WarehouseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { WarehouseScope } from '../auth/auth.types';
import { warehouseFilter } from '../auth/scope.helpers';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseDto } from './dto/warehouse.dto';

const warehouseSelect = {
  id: true,
  name: true,
  address: true,
  contactPerson: true,
  capacity: true,
  status: true,
  createdAt: true,
} satisfies Prisma.WarehouseSelect;

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, dto: CreateWarehouseDto): Promise<WarehouseDto> {
    const created = await this.prisma.warehouse.create({
      data: dto,
      select: warehouseSelect,
    });
    await this.activity.record({
      userId,
      action: 'WAREHOUSE_CREATE',
      entityType: 'Warehouse',
      entityId: created.id,
      warehouseId: created.id,
      summary: `Created warehouse ${created.name}`,
    });
    return created;
  }

  list(
    scope: WarehouseScope,
    opts?: { includeArchived?: boolean },
  ): Promise<WarehouseDto[]> {
    return this.prisma.warehouse.findMany({
      where: {
        ...warehouseFilter(scope, 'id'),
        ...(opts?.includeArchived ? {} : { status: WarehouseStatus.ACTIVE }),
      },
      select: warehouseSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, scope: WarehouseScope): Promise<WarehouseDto> {
    const scopeFilter = warehouseFilter(scope, 'id');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { AND: [{ id }, scopeFilter] },
      select: warehouseSelect,
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseDto> {
    await this.ensureExists(id);
    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
      select: warehouseSelect,
    });
    await this.activity.record({
      userId,
      action: 'WAREHOUSE_UPDATE',
      entityType: 'Warehouse',
      entityId: id,
      warehouseId: id,
      summary: `Updated warehouse ${updated.name}`,
    });
    return updated;
  }

  async archive(userId: string, id: string): Promise<WarehouseDto> {
    await this.ensureExists(id);
    const archived = await this.prisma.warehouse.update({
      where: { id },
      data: { status: WarehouseStatus.INACTIVE },
      select: warehouseSelect,
    });
    await this.activity.record({
      userId,
      action: 'WAREHOUSE_ARCHIVE',
      entityType: 'Warehouse',
      entityId: id,
      warehouseId: id,
      summary: `Archived warehouse ${archived.name}`,
    });
    return archived;
  }

  async assignStaff(
    userId: string,
    id: string,
    dto: AssignStaffDto,
  ): Promise<WarehouseDto> {
    await this.ensureExists(id);
    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: { users: { set: dto.userIds.map((uid) => ({ id: uid })) } },
      select: warehouseSelect,
    });
    await this.activity.record({
      userId,
      action: 'WAREHOUSE_ASSIGN_STAFF',
      entityType: 'Warehouse',
      entityId: id,
      warehouseId: id,
      summary: `Assigned ${dto.userIds.length} staff to ${updated.name}`,
    });
    return updated;
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.warehouse.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Warehouse not found');
  }
}
