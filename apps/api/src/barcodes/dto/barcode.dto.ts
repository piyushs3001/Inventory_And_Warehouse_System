import { ApiProperty } from '@nestjs/swagger';
import { SYMBOLOGIES, type Symbology } from '../barcode.service';

export class BarcodeDto {
  @ApiProperty({
    description: 'The encoded value (a product or variant SKU/barcode).',
    example: 'TSHIRT-L',
  })
  value!: string;

  @ApiProperty({
    description: 'Barcode symbology used.',
    enum: SYMBOLOGIES,
    example: 'code128',
  })
  symbology!: Symbology;

  @ApiProperty({
    description: 'Rendered barcode as a PNG data URI.',
    example: 'data:image/png;base64,iVBORw0KGgo…',
  })
  png!: string;
}
