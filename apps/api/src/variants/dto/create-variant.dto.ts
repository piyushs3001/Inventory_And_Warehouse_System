import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStringRecord', async: false })
export class IsStringRecordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined) return true;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.values(value).every((v) => typeof v === 'string');
  }

  defaultMessage(): string {
    return 'attributes must be an object of string values';
  }
}

export class CreateVariantDto {
  @ApiProperty({
    description: 'Stock keeping unit (unique across products and variants).',
    example: 'COLA-330-RED',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional({
    description: 'Barcode value.',
    example: '5012345678900',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Free-form variant attributes (string values only).',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { size: 'L', color: 'Red' },
  })
  @IsOptional()
  @IsObject()
  @Validate(IsStringRecordConstraint)
  attributes?: Record<string, string>;
}
