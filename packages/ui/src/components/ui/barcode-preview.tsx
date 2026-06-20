import { cn } from '../../utils';

/**
 * Presentational barcode/QR display: renders a PNG `data:` URI produced by the
 * API with a monospace caption of the encoded value. No data fetching — the
 * caller passes an already-fetched `png` (keeps @iws/ui framework-pure).
 */
export function BarcodePreview({
  png,
  value,
  className,
}: {
  png: string;
  value: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-md bg-white p-3 ring-1 ring-foreground/10',
        className,
      )}
    >
      <img src={png} alt={`Barcode for ${value}`} className="max-w-full" />
      <figcaption className="font-mono text-[11px] text-neutral-700">
        {value}
      </figcaption>
    </figure>
  );
}
