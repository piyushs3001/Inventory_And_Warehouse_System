import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({
    description: 'Natural-language question over scoped inventory.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Whether an LLM provider is configured.',
    example: false,
  })
  configured!: boolean;
  @ApiProperty({ description: 'Answer (or a not-configured notice).' })
  answer!: string;
  @ApiProperty({
    description: 'Retrieved source records cited by the answer.',
    type: String,
    isArray: true,
  })
  sources!: string[];
}

export class SummarizeRequestDto {
  @ApiProperty({
    description: 'Report type to summarize.',
    enum: ['inventory', 'purchase', 'warehouse'],
  })
  @IsString()
  @IsIn(['inventory', 'purchase', 'warehouse'])
  type!: string;
}

export class ReportSummaryDto {
  @ApiProperty({ example: 'inventory' }) type!: string;
  @ApiProperty({
    description:
      'LLM-enhanced when a provider is configured; otherwise a deterministic template over the report figures.',
    example: false,
  })
  llmEnhanced!: boolean;
  @ApiProperty({
    description: 'Plain-language summary, accurate to the figures.',
  })
  summary!: string;
  @ApiPropertyOptional({
    description: 'The figures the summary is derived from.',
    type: 'object',
    additionalProperties: true,
  })
  figures!: Record<string, string | number>;
  @ApiProperty() generatedAt!: Date;
}
