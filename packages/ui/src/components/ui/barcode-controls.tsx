import { Button, buttonVariants } from './button';
import { BarcodePreview } from './barcode-preview';

export type BarcodeSymbologyOption = { key: string; label: string };

// Default symbologies the API supports. Labels are UI concern; the API owns the
// validated contract (apps/api .../barcode.service.ts SYMBOLOGIES).
export const BARCODE_SYMBOLOGIES: BarcodeSymbologyOption[] = [
  { key: 'code128', label: 'Code128' },
  { key: 'qr', label: 'QR' },
];

/**
 * Presentational barcode controls shared by both apps: a symbology toggle, an
 * optional download link, and the rendered preview. No data fetching — the
 * caller owns the hook and passes `data`/`isLoading` (keeps @iws/ui pure).
 */
export function BarcodeControls({
  options = BARCODE_SYMBOLOGIES,
  value,
  onSelect,
  data,
  isLoading,
  downloadName,
}: {
  options?: BarcodeSymbologyOption[];
  value: string;
  onSelect: (key: string) => void;
  data?: { value: string; png: string };
  isLoading: boolean;
  /** When provided, a Download link is shown; returns the file name. */
  downloadName?: (value: string, symbology: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((s) => (
          <Button
            key={s.key}
            type="button"
            size="sm"
            variant={value === s.key ? 'default' : 'outline'}
            aria-pressed={value === s.key}
            onClick={() => onSelect(s.key)}
          >
            {s.label}
          </Button>
        ))}
        {downloadName && data && (
          <a
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            download={downloadName(data.value, value)}
            href={data.png}
          >
            Download PNG
          </a>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Generating…</p>
      ) : data ? (
        <BarcodePreview png={data.png} value={data.value} className="max-w-xs" />
      ) : null}
    </div>
  );
}
