import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CountEntryDto {
  @ApiProperty({
    description: 'Product id (UUID) — must be a line on this count.',
  })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Physically counted quantity.',
    example: 118,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  countedQty!: number;
}

export class EnterCountsDto {
  @ApiProperty({
    type: CountEntryDto,
    isArray: true,
    description: 'Counted lines (at least one).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CountEntryDto)
  entries!: CountEntryDto[];
}
