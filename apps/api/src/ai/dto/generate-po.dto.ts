import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PurchaseOrderDto } from '../../purchase-orders/dto/purchase-order.dto';

export class GeneratePoRequestDto {
  @ApiPropertyOptional({
    description: 'Restrict to one warehouse (must be in scope).',
  })
  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;
}

export class SkippedReorderDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty({
    example:
      'No prior supplier on record — assign a supplier and create the PO manually.',
  })
  reason!: string;
}

export class GeneratePoResultDto {
  @ApiProperty({
    description:
      'Draft POs created for review (grouped by supplier × warehouse). Nothing is sent automatically.',
    type: PurchaseOrderDto,
    isArray: true,
  })
  created!: PurchaseOrderDto[];

  @ApiProperty({
    type: SkippedReorderDto,
    isArray: true,
    description: 'Reorder lines that could not be auto-assigned a supplier.',
  })
  skipped!: SkippedReorderDto[];
}
