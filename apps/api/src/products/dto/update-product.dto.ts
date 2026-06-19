import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Product status.',
    enum: ProductStatus,
    enumName: 'ProductStatus',
    example: ProductStatus.ARCHIVED,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
