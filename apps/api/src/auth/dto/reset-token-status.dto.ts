import { ApiProperty } from '@nestjs/swagger';

/** Whether a reset token is currently usable (exists, unexpired, unused). */
export class ResetTokenStatusDto {
  @ApiProperty({
    description: 'True when the token is valid and can be used to reset.',
    example: true,
  })
  valid!: boolean;
}
