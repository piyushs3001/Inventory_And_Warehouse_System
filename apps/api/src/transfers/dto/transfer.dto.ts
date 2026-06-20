import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockTransferStatus } from '@prisma/client';

export class TransferLineDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ example: 'Cola 330ml Can' }) productName!: string;
  @ApiProperty({ example: 'COLA-330' }) sku!: string;
  @ApiProperty({ example: 20 }) quantity!: number;
}

export class TransferDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'TR-00003' }) code!: string;
  @ApiProperty() sourceWarehouseId!: string;
  @ApiProperty({ example: 'Central Warehouse' }) sourceWarehouseName!: string;
  @ApiProperty() destinationWarehouseId!: string;
  @ApiProperty({ example: 'North Depot' }) destinationWarehouseName!: string;

  @ApiProperty({
    enum: StockTransferStatus,
    enumName: 'StockTransferStatus',
    example: StockTransferStatus.REQUESTED,
  })
  status!: StockTransferStatus;

  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ type: TransferLineDto, isArray: true })
  lines!: TransferLineDto[];

  @ApiPropertyOptional({ nullable: true, type: String }) requestedByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) approvedByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) receivedByName!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  approvedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  receivedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
