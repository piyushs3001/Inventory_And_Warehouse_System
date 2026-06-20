'use client';

import { useState, type FormEvent } from 'react';
import { usePurchaseOrdersControllerCreate } from '@iws/api-client';
import type { ProductDto, SupplierDto, WarehouseDto } from '@iws/api-client';
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
  return typeof message === 'string' ? message : 'Could not create purchase order';
}

interface LineRow {
  productId: string;
  quantity: string;
  unitCost: string;
}

const emptyLine: LineRow = { productId: '', quantity: '', unitCost: '' };

export function CreatePoDialog({
  suppliers,
  warehouses,
  products,
  onClose,
  onSuccess,
}: {
  suppliers: SupplierDto[];
  warehouses: WarehouseDto[];
  products: ProductDto[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const create = usePurchaseOrdersControllerCreate();
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
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
    const parsed = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      }));
    if (parsed.length === 0) {
      setError('Add at least one order line');
      return;
    }
    if (parsed.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) {
      setError('Each line needs a whole quantity of 1 or more');
      return;
    }
    if (parsed.some((l) => Number.isNaN(l.unitCost) || l.unitCost < 0)) {
      setError('Each line needs a valid unit cost');
      return;
    }
    try {
      await create.mutateAsync({
        data: {
          supplierId,
          warehouseId,
          expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
          notes: notes || undefined,
          lines: parsed,
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
          <DialogTitle>New purchase order</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="po-supplier">Supplier</Label>
              <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="po-warehouse">Destination warehouse</Label>
              <select id="po-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="po-expected">Expected date</Label>
            <Input id="po-expected" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="max-w-xs" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Order lines</Label>
            <div className="flex flex-col gap-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_6rem_2rem] items-center gap-2">
                  <select
                    aria-label={`Line ${i + 1} product`}
                    value={line.productId}
                    onChange={(e) => setLine(i, { productId: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <Input aria-label={`Line ${i + 1} quantity`} type="number" min={1} placeholder="Qty"
                    value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <Input aria-label={`Line ${i + 1} unit cost`} type="number" min={0} step="0.01" placeholder="Unit cost"
                    value={line.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
                  <Button type="button" variant="outline" size="sm" disabled={lines.length === 1} onClick={() => removeLine(i)} aria-label={`Remove line ${i + 1}`}>×</Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLine}>Add line</Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="po-notes">Notes</Label>
            <Input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create draft</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
