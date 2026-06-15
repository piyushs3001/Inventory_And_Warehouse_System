import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class WarehouseRefDto {
  @ApiProperty({
    description: 'Warehouse id (UUID).',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Warehouse name.', example: 'Main Depot' })
  name!: string;
}

export class UserDto {
  @ApiProperty({
    description: 'User id (UUID).',
    example: '9c1b2d34-5678-90ab-cdef-1234567890ab',
  })
  id!: string;

  @ApiProperty({ description: 'Full name.', example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ description: 'Login email.', example: 'jane@iws.local' })
  email!: string;

  @ApiProperty({
    description: 'Authorization role.',
    enum: Role,
    enumName: 'Role',
    example: Role.STAFF,
  })
  role!: Role;

  @ApiProperty({
    description: 'Account status.',
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @ApiProperty({
    description: 'Account creation timestamp.',
    example: '2026-06-15T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-06-15T10:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    type: () => [WarehouseRefDto],
    description: "Warehouses in the user's scope.",
  })
  warehouses!: WarehouseRefDto[];
}
