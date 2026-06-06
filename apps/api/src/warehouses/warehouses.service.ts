import { Injectable } from '@nestjs/common';
import { WarehouseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseRefDto } from './dto/warehouse-ref.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<WarehouseRefDto[]> {
    return this.prisma.warehouse.findMany({
      where: { status: WarehouseStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
