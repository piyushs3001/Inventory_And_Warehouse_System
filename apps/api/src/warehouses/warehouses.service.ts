import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WarehouseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateWarehouseDto): Promise<WarehouseDto> {
    return this.prisma.warehouse.create({
      data: dto,
      select: warehouseSelect,
    });
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

  async update(id: string, dto: UpdateWarehouseDto): Promise<WarehouseDto> {
    await this.ensureExists(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
      select: warehouseSelect,
    });
  }

  async archive(id: string): Promise<WarehouseDto> {
    await this.ensureExists(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: { status: WarehouseStatus.INACTIVE },
      select: warehouseSelect,
    });
  }

  async assignStaff(id: string, dto: AssignStaffDto): Promise<WarehouseDto> {
    await this.ensureExists(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: { users: { set: dto.userIds.map((uid) => ({ id: uid })) } },
      select: warehouseSelect,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.warehouse.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Warehouse not found');
  }
}
