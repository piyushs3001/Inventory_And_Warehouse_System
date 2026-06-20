import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantStatus } from '@prisma/client';

export class VariantDto {
  @ApiProperty({ description: 'Variant id (UUID).' })
  id!: string;

  @ApiProperty({ description: 'Parent product id (UUID).' })
  productId!: string;

  @ApiProperty({
    description: 'Stock keeping unit (unique across products and variants).',
    example: 'COLA-330-RED',
  })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Barcode value.',
    nullable: true,
    type: String,
  })
  barcode!: string | null;

  @ApiProperty({
    description: 'Free-form variant attributes.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { size: 'L', color: 'Red' },
  })
  attributes!: Record<string, string>;

  @ApiProperty({
    description: 'Variant status.',
    enum: ProductVariantStatus,
    enumName: 'ProductVariantStatus',
    example: ProductVariantStatus.ACTIVE,
  })
  status!: ProductVariantStatus;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-06-20T10:00:00.000Z',
  })
  createdAt!: Date;
}
