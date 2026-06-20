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

export class TransferLineInputDto {
  @ApiProperty({ description: 'Product id (UUID).' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({ description: 'Units to move.', example: 20, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateTransferDto {
  @ApiProperty({
    description: 'Source warehouse id (UUID) — must be in your scope.',
  })
  @IsUUID('4')
  sourceWarehouseId!: string;

  @ApiProperty({ description: 'Destination warehouse id (UUID).' })
  @IsUUID('4')
  destinationWarehouseId!: string;

  @ApiPropertyOptional({ description: 'Free-text notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    type: TransferLineInputDto,
    isArray: true,
    description: 'Lines (at least one).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferLineInputDto)
  lines!: TransferLineInputDto[];
}
