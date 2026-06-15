import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { WarehouseStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateWarehouseDto } from './create-warehouse.dto';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @ApiPropertyOptional({
    description: 'Warehouse status.',
    enum: WarehouseStatus,
    enumName: 'WarehouseStatus',
    example: WarehouseStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;
}
