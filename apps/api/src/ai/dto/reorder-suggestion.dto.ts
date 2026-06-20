import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReorderSuggestionDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ example: 'Cola 330ml Can' }) productName!: string;
  @ApiProperty({ example: 'COLA-330' }) sku!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty({ example: 'Central Warehouse' }) warehouseName!: string;
  @ApiProperty({ example: 40 }) available!: number;
  @ApiProperty({ example: 50 }) reorderLevel!: number;
  @ApiProperty({
    description: 'Suggested order quantity (advisory).',
    example: 60,
  })
  suggestedQty!: number;
  @ApiProperty({
    description: 'Avg daily consumption over the lookback window.',
    example: 3.2,
  })
  dailyConsumption!: number;

  @ApiPropertyOptional({
    description:
      'Projected days until available hits zero (null if no consumption).',
    nullable: true,
    type: Number,
  })
  daysToStockout!: number | null;

  @ApiProperty({
    description: 'Plain-language rationale (reproducible, not LLM).',
  })
  rationale!: string;
}
