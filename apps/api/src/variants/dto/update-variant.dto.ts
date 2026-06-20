import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductVariantStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @ApiPropertyOptional({
    description: 'Variant status.',
    enum: ProductVariantStatus,
    enumName: 'ProductVariantStatus',
    example: ProductVariantStatus.ARCHIVED,
  })
  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;
}
