import { Injectable } from '@nestjs/common';
import * as bwipjs from 'bwip-js/node';

// Single source of truth for the symbology union — reused by the DTO validator
// and Swagger enum so the type, @IsIn list, and docs never drift.
export const SYMBOLOGIES = ['code128', 'qr'] as const;
export type Symbology = (typeof SYMBOLOGIES)[number];

// Maps our public symbology union to bwip-js `bcid` codes. The union is the
// only thing callers (and the validated DTO) can pass, so the mapping is total.
const BCID: Record<Symbology, string> = {
  code128: 'code128',
  qr: 'qrcode',
};

@Injectable()
export class BarcodeService {
  /**
   * Render `value` as a PNG barcode and return it as a `data:` URI. Generated
   * in-process (no object storage); cheap enough to regenerate on demand.
   */
  async render(value: string, symbology: Symbology): Promise<string> {
    // QR is a 2D matrix — `height`/`includetext` don't apply and bwip-js
    // rejects an undefined option, so only set them for the 1D code128.
    const opts =
      symbology === 'qr'
        ? { bcid: BCID.qr, text: value, scale: 4 }
        : {
            bcid: BCID.code128,
            text: value,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center' as const,
          };
    const png = await bwipjs.toBuffer(opts);
    return `data:image/png;base64,${png.toString('base64')}`;
  }
}
