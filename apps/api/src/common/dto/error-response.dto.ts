import { ApiProperty } from '@nestjs/swagger';

/**
 * The single shape every error response uses. Constructed by
 * AllExceptionsFilter at runtime AND declared on endpoints via the error
 * decorators, so the documented error body is exactly what the API returns.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code.', example: 403 })
  statusCode!: number;

  @ApiProperty({ description: 'Short HTTP error label.', example: 'Forbidden' })
  error!: string;

  @ApiProperty({
    description:
      'Human-readable message, or an array of validation messages for 400s.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Out of scope',
  })
  message!: string | string[];

  @ApiProperty({
    description: 'ISO-8601 timestamp when the error was produced.',
    example: '2026-06-15T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Request path that produced the error.',
    example: '/api/v1/warehouses/9c1b…',
  })
  path!: string;
}
