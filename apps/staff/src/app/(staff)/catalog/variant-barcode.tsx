'use client';

import { useState } from 'react';
import { useVariantsControllerBarcode } from '@iws/api-client';
import type { BarcodeDtoSymbology } from '@iws/api-client';
import { BarcodeControls } from '@iws/ui';

// Read-only barcode view for the staff catalog — scan/reference, no download.
export function VariantBarcode({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const [symbology, setSymbology] = useState<BarcodeDtoSymbology>('code128');
  const { data, isLoading } = useVariantsControllerBarcode(
    productId,
    variantId,
    { symbology },
  );
  return (
    <BarcodeControls
      value={symbology}
      onSelect={(k) => setSymbology(k as BarcodeDtoSymbology)}
      data={data}
      isLoading={isLoading}
    />
  );
}
