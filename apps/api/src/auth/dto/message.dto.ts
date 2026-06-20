import { ApiProperty } from '@nestjs/swagger';

/** A simple human-readable acknowledgement (no sensitive detail). */
export class MessageDto {
  @ApiProperty({
    description: 'A generic, non-revealing acknowledgement message.',
    example: 'If an account exists for that email, a reset link has been sent.',
  })
  message!: string;
}
