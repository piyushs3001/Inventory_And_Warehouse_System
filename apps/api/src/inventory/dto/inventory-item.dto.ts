import { ApiProperty } from '@nestjs/swagger';

export class InventoryItemDto {
  @ApiProperty({ description: 'Inventory item id (UUID).' })
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
    description: 'Available units (sellable, on hand).',
    example: 120,
  })
  available!: number;

  @ApiProperty({
    description: 'Reserved units (allocated, still in warehouse).',
    example: 10,
  })
  reserved!: number;

  @ApiProperty({ description: 'Damaged units (unsellable).', example: 2 })
  damaged!: number;

  @ApiProperty({
    description: 'In-transit units (moving between warehouses).',
    example: 0,
  })
  inTransit!: number;

  @ApiProperty({
    description: 'Total on hand = available + reserved + damaged + inTransit.',
    example: 132,
  })
  total!: number;

  @ApiProperty({
    description: 'Reorder threshold for this product.',
    example: 50,
  })
  reorderLevel!: number;

  @ApiProperty({
    description:
      'True when available is at or below the reorder level (server-computed).',
    example: false,
  })
  lowStock!: boolean;

  @ApiProperty({ description: 'Last update timestamp.' })
  updatedAt!: Date;
}

export class InventoryListDto {
  @ApiProperty({ type: InventoryItemDto, isArray: true })
  data!: InventoryItemDto[];

  @ApiProperty({
    description: 'Total matching rows (ignoring pagination).',
    example: 240,
  })
  total!: number;

  @ApiProperty({ description: 'Current page (1-based).', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Page size.', example: 20 })
  pageSize!: number;
}
