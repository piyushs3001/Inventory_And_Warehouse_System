import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ForecastRequestDto {
  @ApiPropertyOptional({ description: 'Limit to one product.' })
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional({
    description: 'Limit to one warehouse (must be in scope).',
  })
  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Forecast horizon in days.',
    example: 7,
    minimum: 1,
    maximum: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

export class ForecastItemDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() warehouseName!: string;
  @ApiProperty({ example: 40 }) available!: number;
  @ApiProperty({
    description: 'Avg daily consumption (moving average).',
    example: 3.2,
  })
  avgDailyConsumption!: number;
  @ApiProperty({
    description: 'Projected demand over the horizon.',
    example: 22,
  })
  forecastDemand!: number;

  @ApiPropertyOptional({
    description: 'Projected stock-out date (null if no consumption).',
    nullable: true,
    type: String,
  })
  projectedStockoutDate!: Date | null;

  @ApiProperty() rationale!: string;
}

export class ForecastResultDto {
  @ApiProperty({ example: 7 }) days!: number;
  @ApiProperty({
    description: 'Lookback window used for the moving average (days).',
    example: 30,
  })
  lookbackDays!: number;
  @ApiProperty({ type: ForecastItemDto, isArray: true })
  items!: ForecastItemDto[];
  @ApiProperty() generatedAt!: Date;
}
