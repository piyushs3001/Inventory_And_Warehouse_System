import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Buckets a manual adjustment may target. Reserved and in-transit are managed
 * by the reserve and transfer flows respectively, never adjusted free-form.
 */
export enum AdjustableBucket {
  AVAILABLE = 'AVAILABLE',
  DAMAGED = 'DAMAGED',
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Product id (UUID).' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Warehouse id (UUID) — must be within your scope.',
  })
  @IsUUID('4')
  warehouseId!: string;

  @ApiProperty({
    description: 'Bucket to adjust.',
    enum: AdjustableBucket,
    enumName: 'AdjustableBucket',
    example: AdjustableBucket.AVAILABLE,
  })
  @IsEnum(AdjustableBucket)
  bucket!: AdjustableBucket;

  @ApiProperty({
    description:
      'Signed change to apply to the bucket (e.g. +5 to add, -3 to remove). Must be non-zero and may not drive the bucket below zero.',
    example: 5,
  })
  @IsInt()
  delta!: number;

  @ApiProperty({
    description: 'Reason for the adjustment (required — audit trail).',
    example: 'Cycle count correction',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
