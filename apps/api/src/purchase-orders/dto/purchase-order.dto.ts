import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class PurchaseOrderLineDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ example: 'Cola 330ml Can' }) productName!: string;
  @ApiProperty({ example: 'COLA-330' }) sku!: string;
  @ApiProperty({ example: 100 }) quantity!: number;
  @ApiProperty({
    description: 'Unit cost as a decimal string.',
    example: '0.45',
  })
  unitCost!: string;
  @ApiProperty({ description: 'Cumulative sound units received.', example: 50 })
  receivedQty!: number;
  @ApiProperty({
    description: 'Cumulative damaged units received.',
    example: 2,
  })
  damagedQty!: number;
  @ApiProperty({
    description: 'Ordered minus received (sound). Never below zero.',
    example: 50,
  })
  outstandingQty!: number;
}

export class PurchaseOrderDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Human-readable PO code.', example: 'PO-00007' })
  code!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty({ example: 'Acme Beverages Ltd' }) supplierName!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty({ example: 'Central Warehouse' }) warehouseName!: string;

  @ApiProperty({
    enum: PurchaseOrderStatus,
    enumName: 'PurchaseOrderStatus',
    example: PurchaseOrderStatus.DRAFT,
  })
  status!: PurchaseOrderStatus;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Expected delivery date (ISO).',
  })
  expectedDate!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ type: PurchaseOrderLineDto, isArray: true })
  lines!: PurchaseOrderLineDto[];

  @ApiProperty({
    description:
      'Total ordered value = Σ(quantity × unitCost), decimal string.',
    example: '45.00',
  })
  totalCost!: string;

  @ApiProperty() createdById!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) createdByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) approvedByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) sentAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  approvedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  completedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
