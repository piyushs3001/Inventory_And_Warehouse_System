import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Public self-registration. Role and scope are NOT accepted from the client —
 * a self-registered account is always created as STAFF with no warehouse scope
 * and PENDING_APPROVAL status (see AuthService.register).
 */
export class RegisterDto {
  @ApiProperty({ description: 'Full name.', example: 'Rosa Martins' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    description: 'Unique work email.',
    example: 'rosa@company.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password (min 8 chars).',
    example: 'S3curePass!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
