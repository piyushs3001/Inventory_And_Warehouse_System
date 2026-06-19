import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({
    description: 'Category id (UUID).',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Category name.', example: 'Beverages' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Parent category id (UUID), or null for a root category.',
    example: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
    nullable: true,
    type: String,
  })
  parentId!: string | null;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-06-19T10:00:00.000Z',
  })
  createdAt!: Date;
}
