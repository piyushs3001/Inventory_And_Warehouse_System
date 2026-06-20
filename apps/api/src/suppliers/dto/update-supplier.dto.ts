import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SupplierStatus } from '@prisma/client';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({
    description: 'Supplier status (set INACTIVE to soft-delete/deactivate).',
    enum: SupplierStatus,
    enumName: 'SupplierStatus',
  })
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;
}
