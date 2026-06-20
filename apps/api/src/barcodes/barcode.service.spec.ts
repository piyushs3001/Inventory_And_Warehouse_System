import { BarcodeService } from './barcode.service';

describe('BarcodeService', () => {
  const service = new BarcodeService();

  it('renders a code128 barcode as a PNG data URI', async () => {
    const uri = await service.render('TSHIRT-L', 'code128');
    expect(uri.startsWith('data:image/png;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('renders a QR code as a PNG data URI', async () => {
    const uri = await service.render('TSHIRT-L', 'qr');
    expect(uri.startsWith('data:image/png;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('produces different output for different symbologies', async () => {
    const [c128, qr] = await Promise.all([
      service.render('SAME-VALUE', 'code128'),
      service.render('SAME-VALUE', 'qr'),
    ]);
    expect(c128).not.toEqual(qr);
  });
});
