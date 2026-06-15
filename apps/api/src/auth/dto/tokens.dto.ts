import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty({
    description: 'Short-lived JWT for the Authorization header.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived JWT used to rotate the pair at /auth/refresh.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
  })
  refreshToken!: string;
}
