import { ApiProperty } from '@nestjs/swagger';

export class ReportColumnDto {
  @ApiProperty({ example: 'sku' }) key!: string;
  @ApiProperty({ example: 'SKU' }) label!: string;
  @ApiProperty({
    description: 'Render right-aligned / numeric.',
    example: false,
  })
  numeric!: boolean;
}

export class ReportDto {
  @ApiProperty({ example: 'inventory' }) type!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty({ type: ReportColumnDto, isArray: true })
  columns!: ReportColumnDto[];

  @ApiProperty({
    description: 'Row objects keyed by column key (string | number values).',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  rows!: Record<string, string | number>[];

  @ApiProperty({
    description: 'Summary totals keyed by label.',
    type: 'object',
    additionalProperties: true,
  })
  summary!: Record<string, string | number>;
}
