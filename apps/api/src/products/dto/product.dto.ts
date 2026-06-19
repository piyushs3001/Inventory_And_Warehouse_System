import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

export class ProductDto {
  @ApiProperty({
    description: 'Product id (UUID).',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Product name.', example: 'Cola 330ml Can' })
  name!: string;

  @ApiProperty({
    description: 'Stock keeping unit (unique).',
    example: 'COLA-330',
  })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Free-text description.',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Category id (UUID), or null.',
    nullable: true,
    type: String,
  })
  categoryId!: string | null;

  @ApiPropertyOptional({
    description: 'Unit of measure.',
    nullable: true,
    type: String,
  })
  unit!: string | null;

  @ApiProperty({
    description: 'Cost price as a decimal string (never a float).',
    type: String,
    example: '0.45',
  })
  costPrice!: string;

  @ApiProperty({
    description: 'Selling price as a decimal string.',
    type: String,
    example: '1.20',
  })
  sellingPrice!: string;

  @ApiProperty({ description: 'Reorder level.', example: 50 })
  reorderLevel!: number;

  @ApiProperty({
    description: 'Product status.',
    enum: ProductStatus,
    enumName: 'ProductStatus',
    example: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-06-19T10:00:00.000Z',
  })
  createdAt!: Date;
}
