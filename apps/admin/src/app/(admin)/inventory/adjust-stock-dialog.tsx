'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  useInventoryControllerAdjust,
  AdjustableBucket,
} from '@iws/api-client';
import type { ProductDto, WarehouseDto } from '@iws/api-client';
import {
  Button,
  Input,
  Label,
  SimpleSelect,
  SimpleCombobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not adjust stock';
}

// Locked context (launched from a row) vs free selection ("Add stock").
export interface AdjustContext {
  productId: string;
  warehouseId: string;
  productName: string;
  warehouseName: string;
  available: number;
  damaged: number;
}

export function AdjustStockDialog({
  context,
  products,
  warehouses,
  onClose,
  onSuccess,
}: {
  context?: AdjustContext;
  products: ProductDto[];
  warehouses: WarehouseDto[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const adjust = useInventoryControllerAdjust();
  const locked = Boolean(context);

  const [productId, setProductId] = useState(context?.productId ?? '');
  const [warehouseId, setWarehouseId] = useState(context?.warehouseId ?? '');
  const [bucket, setBucket] = useState<AdjustableBucket>(
    AdjustableBucket.AVAILABLE,
  );
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentForBucket = useMemo(() => {
    if (!context) return null;
    return bucket === AdjustableBucket.AVAILABLE
      ? context.available
      : context.damaged;
  }, [context, bucket]);

  const deltaNum = delta === '' ? null : Number(delta);
  const preview =
    currentForBucket != null && deltaNum != null
      ? currentForBucket + deltaNum
      : null;

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (deltaNum == null || Number.isNaN(deltaNum) || deltaNum === 0) {
      setError('Enter a non-zero change');
      return;
    }
    try {
      await adjust.mutateAsync({
        data: { productId, warehouseId, bucket, delta: deltaNum, reason },
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-product">Product</Label>
            {locked ? (
              <Input id="adj-product" value={context!.productName} readOnly disabled />
            ) : (
              <SimpleCombobox
                id="adj-product"
                className="w-full"
                value={productId}
                onValueChange={setProductId}
                placeholder="Select a product…"
                searchPlaceholder="Search products…"
                options={[
                  { value: '', label: 'Select a product…' },
                  ...products.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.sku})`,
                    keywords: p.sku,
                  })),
                ]}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-warehouse">Warehouse</Label>
            {locked ? (
              <Input id="adj-warehouse" value={context!.warehouseName} readOnly disabled />
            ) : (
              <SimpleCombobox
                id="adj-warehouse"
                className="w-full"
                value={warehouseId}
                onValueChange={setWarehouseId}
                placeholder="Select a warehouse…"
                searchPlaceholder="Search warehouses…"
                options={[
                  { value: '', label: 'Select a warehouse…' },
                  ...warehouses.map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="adj-bucket">Bucket</Label>
              <SimpleSelect
                id="adj-bucket"
                className="w-full"
                value={bucket}
                onValueChange={(v) => setBucket(v as AdjustableBucket)}
                options={[
                  { value: AdjustableBucket.AVAILABLE, label: 'Available' },
                  { value: AdjustableBucket.DAMAGED, label: 'Damaged' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="adj-delta">Change (+/−)</Label>
              <Input
                id="adj-delta"
                type="number"
                step="1"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. 10 or -3"
                required
              />
            </div>
          </div>
          {preview != null && (
            <p className="text-sm text-muted-foreground" data-testid="adjust-preview">
              {currentForBucket} → <span className="font-semibold tabular-nums">{preview}</span>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="adj-reason">Reason</Label>
            <Input
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is the stock changing?"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={adjust.isPending}>Apply adjustment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
