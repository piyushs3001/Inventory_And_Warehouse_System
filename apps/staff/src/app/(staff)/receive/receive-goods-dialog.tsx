'use client';

import { useState, type FormEvent } from 'react';
import { usePurchaseOrdersControllerReceive } from '@iws/api-client';
import type { PurchaseOrderDto } from '@iws/api-client';
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
  return typeof message === 'string' ? message : 'Could not record receipt';
}

interface LineEntry {
  sound: string;
  damaged: string;
}

export function ReceiveGoodsDialog({
  po,
  onClose,
  onSuccess,
}: {
  po: PurchaseOrderDto;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const receive = usePurchaseOrdersControllerReceive();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<Record<string, LineEntry>>(
    Object.fromEntries(po.lines.map((l) => [l.productId, { sound: '', damaged: '' }])),
  );
  const [error, setError] = useState<string | null>(null);

  const setEntry = (productId: string, patch: Partial<LineEntry>) =>
    setEntries((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const lines = po.lines
      .map((l) => {
        const entry = entries[l.productId];
        return {
          productId: l.productId,
          soundQty: entry.sound === '' ? 0 : Number(entry.sound),
          damagedQty: entry.damaged === '' ? 0 : Number(entry.damaged),
          outstanding: l.outstandingQty,
          sku: l.sku,
        };
      })
      .filter((l) => l.soundQty > 0 || l.damagedQty > 0);

    if (lines.length === 0) {
      setError('Enter received quantities for at least one line');
      return;
    }
    const bad = lines.find(
      (l) =>
        !Number.isInteger(l.soundQty) ||
        l.soundQty < 0 ||
        !Number.isInteger(l.damagedQty) ||
        l.damagedQty < 0,
    );
    if (bad) {
      setError('Quantities must be whole numbers of 0 or more');
      return;
    }
    // No over-receipt: sound + damaged together can't exceed the remaining
    // capacity (outstandingQty = ordered − received − damaged).
    const over = lines.find((l) => l.soundQty + l.damagedQty > l.outstanding);
    if (over) {
      setError(`${over.sku}: ${over.soundQty + over.damagedQty} units exceeds remaining ${over.outstanding}`);
      return;
    }

    try {
      await receive.mutateAsync({
        id: po.id,
        data: {
          deliveryNote: deliveryNote || undefined,
          notes: notes || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            soundQty: l.soundQty,
            damagedQty: l.damagedQty,
          })),
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive goods · {po.code}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {po.supplierName} → {po.warehouseName}. Enter sound and damaged units per line; sound goes to Available, damaged to Damaged.
          </p>

          <div className="rounded-lg border border-border">
            <div className="grid grid-cols-[1fr_5rem_5rem_5rem] gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span>Product</span>
              <span className="text-right">Outstanding</span>
              <span className="text-right">Sound</span>
              <span className="text-right">Damaged</span>
            </div>
            {po.lines.map((l) => (
              <div key={l.productId} className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold">{l.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{l.sku}</div>
                </div>
                <div className="text-right tabular-nums">{l.outstandingQty}</div>
                <Input
                  aria-label={`Sound qty for ${l.sku}`}
                  type="number" min={0} max={l.outstandingQty}
                  value={entries[l.productId]?.sound ?? ''}
                  onChange={(e) => setEntry(l.productId, { sound: e.target.value })}
                />
                <Input
                  aria-label={`Damaged qty for ${l.sku}`}
                  type="number" min={0}
                  value={entries[l.productId]?.damaged ?? ''}
                  onChange={(e) => setEntry(l.productId, { damaged: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rcv-dn">Delivery note ref</Label>
              <Input id="rcv-dn" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="e.g. DN-1042" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rcv-notes">Notes</Label>
              <Input id="rcv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={receive.isPending}>Record receipt</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
