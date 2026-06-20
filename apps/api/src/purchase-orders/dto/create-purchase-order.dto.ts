import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderLineInputDto {
  @ApiProperty({ description: 'Product id (UUID).' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({ description: 'Quantity ordered.', example: 100, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit cost.', example: 0.45, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Supplier id (UUID).' })
  @IsUUID('4')
  supplierId!: string;

  @ApiProperty({
    description: 'Destination warehouse id (UUID) — must be in your scope.',
  })
  @IsUUID('4')
  warehouseId!: string;

  @ApiPropertyOptional({
    description: 'Expected delivery date (ISO).',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    type: PurchaseOrderLineInputDto,
    isArray: true,
    description: 'Order lines (at least one).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineInputDto)
  lines!: PurchaseOrderLineInputDto[];
}
