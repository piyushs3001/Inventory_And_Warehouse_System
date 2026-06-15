import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignWarehousesDto {
  @ApiProperty({
    description: 'Full set of warehouse ids the user is scoped to (replaces existing).',
    type: [String],
    example: ['9c1b2d34-5678-90ab-cdef-1234567890ab'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  warehouseIds!: string[];
}
