import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseStatus } from '@prisma/client';

export class WarehouseDto {
  @ApiProperty({
    description: 'Warehouse id (UUID).',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Warehouse name.', example: 'Central Warehouse' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Street address.',
    example: '12 Dock Rd',
    nullable: true,
    type: String,
  })
  address!: string | null;

  @ApiPropertyOptional({
    description: 'On-site contact person.',
    example: 'Sam Lee',
    nullable: true,
    type: String,
  })
  contactPerson!: string | null;

  @ApiPropertyOptional({
    description: 'Storage capacity (units).',
    example: 5000,
    nullable: true,
    type: Number,
  })
  capacity!: number | null;

  @ApiProperty({
    description: 'Warehouse status.',
    enum: WarehouseStatus,
    enumName: 'WarehouseStatus',
    example: WarehouseStatus.ACTIVE,
  })
  status!: WarehouseStatus;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-06-15T10:00:00.000Z',
  })
  createdAt!: Date;
}
