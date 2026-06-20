import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiveGoodsLineDto {
  @ApiProperty({ description: 'Product id (UUID) — must belong to the PO.' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Sound units received (go to Available).',
    example: 50,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  soundQty!: number;

  @ApiProperty({
    description: 'Damaged units received (go to Damaged).',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  damagedQty!: number;
}

export class ReceiveGoodsDto {
  @ApiPropertyOptional({
    description: 'Delivery-note reference (file upload deferred).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNote?: string;

  @ApiPropertyOptional({ description: 'Receipt notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    type: ReceiveGoodsLineDto,
    isArray: true,
    description: 'Received lines (at least one).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveGoodsLineDto)
  lines!: ReceiveGoodsLineDto[];
}
