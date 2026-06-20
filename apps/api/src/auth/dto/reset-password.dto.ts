import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The reset token from the email link.',
    example: 'a1b2c3...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'New password (min 8 chars).',
    example: 'S3curePass!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
