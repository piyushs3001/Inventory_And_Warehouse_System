import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';

export class StockMovementDto {
  @ApiProperty({ description: 'Movement id (UUID).' })
  id!: string;

  @ApiProperty({ description: 'Product id (UUID).' })
  productId!: string;

  @ApiProperty({ description: 'Product name.', example: 'Cola 330ml Can' })
  productName!: string;

  @ApiProperty({ description: 'Product SKU.', example: 'COLA-330' })
  sku!: string;

  @ApiProperty({ description: 'Warehouse id (UUID).' })
  warehouseId!: string;

  @ApiProperty({ description: 'Warehouse name.', example: 'Central DC' })
  warehouseName!: string;

  @ApiProperty({
    description: 'Movement type.',
    enum: MovementType,
    enumName: 'MovementType',
    example: MovementType.ADJUSTMENT,
  })
  type!: MovementType;

  @ApiProperty({
    description: 'Signed change to the available bucket.',
    example: -10,
  })
  availableDelta!: number;

  @ApiProperty({
    description: 'Signed change to the reserved bucket.',
    example: 10,
  })
  reservedDelta!: number;

  @ApiProperty({
    description: 'Signed change to the damaged bucket.',
    example: 0,
  })
  damagedDelta!: number;

  @ApiProperty({
    description: 'Signed change to the in-transit bucket.',
    example: 0,
  })
  inTransitDelta!: number;

  @ApiProperty({
    description: 'Total on hand before the movement.',
    example: 132,
  })
  beforeQty!: number;

  @ApiProperty({
    description: 'Total on hand after the movement.',
    example: 132,
  })
  afterQty!: number;

  @ApiPropertyOptional({
    description: 'Reason / note.',
    nullable: true,
    type: String,
  })
  reason!: string | null;

  @ApiPropertyOptional({
    description: 'Source document type (e.g. PO, TRANSFER, COUNT).',
    nullable: true,
    type: String,
  })
  refType!: string | null;

  @ApiPropertyOptional({
    description: 'Source document id.',
    nullable: true,
    type: String,
  })
  refId!: string | null;

  @ApiProperty({ description: 'Acting user id (UUID).' })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Acting user name.',
    nullable: true,
    type: String,
  })
  userName!: string | null;

  @ApiProperty({ description: 'When the movement was recorded.' })
  createdAt!: Date;
}

export class MovementListDto {
  @ApiProperty({ type: StockMovementDto, isArray: true })
  data!: StockMovementDto[];

  @ApiProperty({
    description: 'Total matching rows (ignoring pagination).',
    example: 540,
  })
  total!: number;

  @ApiProperty({ description: 'Current page (1-based).', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Page size.', example: 20 })
  pageSize!: number;
}
