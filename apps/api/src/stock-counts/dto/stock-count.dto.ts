import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockCountStatus } from '@prisma/client';

export class StockCountLineDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ example: 'Cola 330ml Can' }) productName!: string;
  @ApiProperty({ example: 'COLA-330' }) sku!: string;
  @ApiProperty({
    description: 'System available at session creation.',
    example: 120,
  })
  recordedQty!: number;

  @ApiPropertyOptional({
    description: 'Physically counted (null until entered).',
    nullable: true,
    type: Number,
  })
  countedQty!: number | null;

  @ApiPropertyOptional({
    description:
      'counted − recorded (null until counted). Positive = surplus, negative = shrinkage.',
    nullable: true,
    type: Number,
  })
  variance!: number | null;
}

export class StockCountDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'SC-00002' }) code!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty({ example: 'Central Warehouse' }) warehouseName!: string;

  @ApiProperty({
    enum: StockCountStatus,
    enumName: 'StockCountStatus',
    example: StockCountStatus.OPEN,
  })
  status!: StockCountStatus;

  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ type: StockCountLineDto, isArray: true })
  lines!: StockCountLineDto[];

  @ApiPropertyOptional({ nullable: true, type: String }) createdByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) reconciledByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  reconciledAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
