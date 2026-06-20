import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

/**
 * Request a password-reset email. `app` selects which surface the reset link
 * points back to (a Warehouse Manager can use both), echoing the requesting app.
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email of the account to reset.',
    example: 'rosa@company.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Which app requested the reset; the link points back to it.',
    enum: ['staff', 'admin'],
    example: 'staff',
  })
  @IsIn(['staff', 'admin'])
  app!: 'staff' | 'admin';
}
