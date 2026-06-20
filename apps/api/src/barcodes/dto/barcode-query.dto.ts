import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SYMBOLOGIES, type Symbology } from '../barcode.service';

export class BarcodeQueryDto {
  @ApiPropertyOptional({
    description: 'Barcode symbology; defaults to code128.',
    enum: SYMBOLOGIES,
    example: 'code128',
  })
  @IsOptional()
  @IsIn(SYMBOLOGIES)
  symbology?: Symbology;
}
