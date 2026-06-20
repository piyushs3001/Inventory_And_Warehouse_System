import { ApiProperty } from '@nestjs/swagger';

export class DashboardMovementDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() warehouseName!: string;
  @ApiProperty() afterQty!: number;
  @ApiProperty() createdAt!: Date;
}

export class DashboardTopProductDto {
  @ApiProperty() productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ description: 'Available units across the caller scope.' })
  units!: number;
  @ApiProperty({
    description: 'Stock value (units × cost price), decimal string.',
  })
  value!: string;
}

export class DashboardDto {
  @ApiProperty({ description: 'Active products in the catalog (global).' })
  totalProducts!: number;
  @ApiProperty({
    description: 'Total on-hand units across the caller scope (all buckets).',
  })
  totalStockUnits!: number;
  @ApiProperty({
    description: 'Stock value = Σ(available × cost price), decimal string.',
  })
  stockValue!: string;
  @ApiProperty({ description: 'Inventory items at/below reorder level.' })
  lowStockCount!: number;
  @ApiProperty({
    description:
      'Purchase orders awaiting action (Sent/Approved/Partially Received).',
  })
  pendingPurchaseOrders!: number;
  @ApiProperty({
    description: 'Transfers awaiting action (Requested/Approved).',
  })
  pendingTransfers!: number;
  @ApiProperty({ type: DashboardMovementDto, isArray: true })
  recentMovements!: DashboardMovementDto[];
  @ApiProperty({ type: DashboardTopProductDto, isArray: true })
  topProducts!: DashboardTopProductDto[];
}
