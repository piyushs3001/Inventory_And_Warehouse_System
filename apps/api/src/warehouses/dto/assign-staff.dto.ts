import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignStaffDto {
  @ApiProperty({
    description: 'User ids to assign as staff/managers of this warehouse.',
    type: [String],
    example: ['9c1b2d34-5678-90ab-cdef-1234567890ab'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];
}
