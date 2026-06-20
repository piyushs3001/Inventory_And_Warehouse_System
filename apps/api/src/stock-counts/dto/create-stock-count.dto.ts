import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStockCountDto {
  @ApiProperty({
    description: 'Warehouse id (UUID) to count — must be in your scope.',
  })
  @IsUUID('4')
  warehouseId!: string;

  @ApiPropertyOptional({ description: 'Notes (e.g. section/aisle counted).' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
