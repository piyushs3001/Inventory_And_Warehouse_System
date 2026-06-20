'use client';

import { useState, type FormEvent } from 'react';
import { useTransfersControllerCreate } from '@iws/api-client';
import type { ProductDto, WarehouseDto } from '@iws/api-client';
import { Button, Input, Label } from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not request transfer';
}

interface LineRow {
  productId: string;
  quantity: string;
}

const emptyLine: LineRow = { productId: '', quantity: '' };

// Staff request stock OUT of one of their assigned warehouses. Source and
// destination are drawn from the (scope-filtered) warehouse list.
export function RequestTransferForm({
  warehouses,
  products,
  onDone,
}: {
  warehouses: WarehouseDto[];
  products: ProductDto[];
  onDone: () => void;
}) {
  const create = useTransfersControllerCreate();
  const [sourceWarehouseId, setSourceWarehouseId] = useState(
    warehouses.length === 1 ? warehouses[0].id : '',
  );
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineRow[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);

  const setLine = (i: number, patch: Partial<LineRow>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (sourceWarehouseId === destinationWarehouseId) {
      setError('Source and destination must differ');
      return;
    }
    const parsed = lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));
    if (parsed.length === 0) {
      setError('Add at least one line');
      return;
    }
    if (parsed.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) {
      setError('Each line needs a whole quantity of 1 or more');
      return;
    }
    try {
      await create.mutateAsync({
        data: {
          sourceWarehouseId,
          destinationWarehouseId,
          notes: notes || undefined,
          lines: parsed,
        },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tr-source">From (your warehouse)</Label>
          <select id="tr-source" value={sourceWarehouseId} onChange={(e) => setSourceWarehouseId(e.target.value)} required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tr-dest">To (destination)</Label>
          <select id="tr-dest" value={destinationWarehouseId} onChange={(e) => setDestinationWarehouseId(e.target.value)} required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            {warehouses.filter((w) => w.id !== sourceWarehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Lines</Label>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2">
            <select aria-label={`Line ${i + 1} product`} value={line.productId}
              onChange={(e) => setLine(i, { productId: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <Input aria-label={`Line ${i + 1} quantity`} type="number" min={1} placeholder="Qty"
              value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <Button type="button" variant="outline" size="sm" disabled={lines.length === 1} onClick={() => removeLine(i)} aria-label={`Remove line ${i + 1}`}>×</Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLine}>Add line</Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tr-notes">Notes</Label>
        <Input id="tr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={create.isPending}>Request</Button>
      </div>
    </form>
  );
}
