import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Account email.', example: 'admin@iws.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Account password.', example: 'Admin@12345' })
  @IsString()
  @MinLength(1)
  password!: string;
}
