import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoodsReceiptLineDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ example: 'Cola 330ml Can' }) productName!: string;
  @ApiProperty({ example: 'COLA-330' }) sku!: string;
  @ApiProperty({ example: 50 }) soundQty!: number;
  @ApiProperty({ example: 2 }) damagedQty!: number;
}

export class GoodsReceiptDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty({ example: 'PO-00007' }) poCode!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() receivedById!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) receivedByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) deliveryNote!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;

  @ApiProperty({
    description: 'PO status after this receipt was applied.',
    example: 'PARTIALLY_RECEIVED',
  })
  resultingPoStatus!: string;

  @ApiProperty({ type: GoodsReceiptLineDto, isArray: true })
  lines!: GoodsReceiptLineDto[];

  @ApiProperty() createdAt!: Date;
}
