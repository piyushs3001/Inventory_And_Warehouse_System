import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseRefDto } from './dto/warehouse-ref.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<WarehouseRefDto[]> {
    return this.prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
