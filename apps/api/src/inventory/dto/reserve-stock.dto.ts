import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ description: 'Product id (UUID).' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Warehouse id (UUID) — must be within your scope.',
  })
  @IsUUID('4')
  warehouseId!: string;

  @ApiProperty({
    description:
      'Units to move from available to reserved. Must not exceed available.',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Optional note describing what the stock is reserved for.',
    example: 'SO-4821',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
