import { ApiProperty } from '@nestjs/swagger';

export class SupplierPerformanceDto {
  @ApiProperty({ description: 'Supplier id (UUID).' })
  supplierId!: string;

  @ApiProperty({
    description: 'Total purchase orders raised (excluding cancelled).',
    example: 12,
  })
  totalOrders!: number;

  @ApiProperty({
    description: 'Purchase orders fully received (Completed).',
    example: 9,
  })
  completedOrders!: number;

  @ApiProperty({
    description: 'Total units ordered across all lines.',
    example: 4200,
  })
  unitsOrdered!: number;

  @ApiProperty({ description: 'Total sound units received.', example: 4050 })
  unitsReceived!: number;

  @ApiProperty({ description: 'Total damaged units received.', example: 60 })
  unitsDamaged!: number;

  @ApiProperty({
    description:
      'Sound units received ÷ units ordered, as a 0–1 ratio (null if nothing ordered).',
    example: 0.96,
    nullable: true,
    type: Number,
  })
  quantityAccuracy!: number | null;

  @ApiProperty({
    description:
      'Damaged ÷ (sound + damaged) received, 0–1 (null if nothing received).',
    example: 0.015,
    nullable: true,
    type: Number,
  })
  damageRate!: number | null;

  @ApiProperty({
    description:
      'Completed orders received on/before expectedDate ÷ completed orders with an expectedDate, 0–1 (null if none).',
    example: 0.89,
    nullable: true,
    type: Number,
  })
  onTimeRate!: number | null;
}
