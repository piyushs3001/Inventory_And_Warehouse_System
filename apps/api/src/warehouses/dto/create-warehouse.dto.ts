import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Warehouse name.', example: 'Central Warehouse' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Street address.',
    example: '12 Dock Rd',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'On-site contact person.',
    example: 'Sam Lee',
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Storage capacity (units).',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}
