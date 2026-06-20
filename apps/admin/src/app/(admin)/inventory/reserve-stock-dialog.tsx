'use client';

import { useState, type FormEvent } from 'react';
import { useInventoryControllerReserve } from '@iws/api-client';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not reserve stock';
}

export interface ReserveContext {
  productId: string;
  warehouseId: string;
  productName: string;
  warehouseName: string;
  available: number;
}

export function ReserveStockDialog({
  context,
  onClose,
  onSuccess,
}: {
  context: ReserveContext;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const reserve = useInventoryControllerReserve();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const qtyNum = quantity === '' ? null : Number(quantity);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (qtyNum == null || !Number.isInteger(qtyNum) || qtyNum < 1) {
      setError('Enter a whole quantity of 1 or more');
      return;
    }
    if (qtyNum > context.available) {
      setError(`Only ${context.available} available to reserve`);
      return;
    }
    try {
      await reserve.mutateAsync({
        data: {
          productId: context.productId,
          warehouseId: context.warehouseId,
          quantity: qtyNum,
          reason: reason || undefined,
        },
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
          <DialogTitle>Reserve stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {context.productName} · {context.warehouseName} ·{' '}
            <span className="font-semibold tabular-nums">{context.available}</span> available
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-qty">Quantity to reserve</Label>
            <Input
              id="res-qty"
              type="number"
              min={1}
              max={context.available}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-reason">Note (optional)</Label>
            <Input
              id="res-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sales order SO-4821"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={reserve.isPending}>Reserve</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
