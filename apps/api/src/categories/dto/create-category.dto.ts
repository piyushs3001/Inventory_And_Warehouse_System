import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name.', example: 'Beverages' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description:
      'Parent category id (UUID) for nesting; omit for a root category.',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}
