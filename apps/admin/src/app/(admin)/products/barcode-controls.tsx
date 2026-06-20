'use client';

import { useState } from 'react';
import {
  useProductsControllerBarcode,
  useVariantsControllerBarcode,
} from '@iws/api-client';
import type { BarcodeDtoSymbology } from '@iws/api-client';
import { BarcodeControls } from '@iws/ui';

const fileName = (value: string, symbology: string): string =>
  `${value}-${symbology}.png`;

export function ProductBarcode({ productId }: { productId: string }) {
  const [symbology, setSymbology] = useState<BarcodeDtoSymbology>('code128');
  const { data, isLoading } = useProductsControllerBarcode(productId, {
    symbology,
  });
  return (
    <BarcodeControls
      value={symbology}
      onSelect={(k) => setSymbology(k as BarcodeDtoSymbology)}
      data={data}
      isLoading={isLoading}
      downloadName={fileName}
    />
  );
}

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
      downloadName={fileName}
    />
  );
}
