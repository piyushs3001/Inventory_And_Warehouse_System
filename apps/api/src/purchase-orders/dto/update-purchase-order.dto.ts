import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PurchaseOrderLineInputDto } from './create-purchase-order.dto';

// Only legal while the PO is in DRAFT (enforced in the service).
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Expected delivery date (ISO).' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ description: 'Free-text notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    type: PurchaseOrderLineInputDto,
    isArray: true,
    description:
      'Replacement set of order lines (replaces all existing lines).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineInputDto)
  lines?: PurchaseOrderLineInputDto[];
}
