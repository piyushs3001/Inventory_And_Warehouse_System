import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ description: 'Supplier name.', example: 'Acme Beverages Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Primary contact person.',
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Contact email.',
    example: 'orders@acme.example',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone.',
    example: '+1 555 0100',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Address.',
    example: '12 Industrial Way',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
