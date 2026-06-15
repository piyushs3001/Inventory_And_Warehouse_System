import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ description: 'Service liveness flag.', example: 'ok' })
  status!: string;
}
