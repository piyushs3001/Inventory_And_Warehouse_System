import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name.', example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Unique login email.', example: 'jane@iws.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Initial password (min 8 chars).', example: 'S3curePass!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'Role; defaults to STAFF when omitted.',
    enum: Role,
    enumName: 'Role',
    example: Role.STAFF,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
