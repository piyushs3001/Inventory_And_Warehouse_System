import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityLogDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) userId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) userName!:
    | string
    | null;
  @ApiProperty({ example: 'PO_APPROVE' }) action!: string;
  @ApiProperty({ example: 'PurchaseOrder' }) entityType!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) entityId!:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) warehouseId!:
    | string
    | null;
  @ApiProperty({ example: 'Approved PO-00007' }) summary!: string;
  @ApiProperty() createdAt!: Date;
}

export class ActivityLogListDto {
  @ApiProperty({ type: ActivityLogDto, isArray: true }) data!: ActivityLogDto[];
  @ApiProperty({ example: 540 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
}
