'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePurchaseOrdersControllerCreate,
  getPurchaseOrdersControllerListQueryKey,
  useSuppliersControllerList,
  useWarehousesControllerList,
  useProductsControllerList,
} from '@iws/api-client';
import { Button, Input, Label, SimpleSelect } from '@iws/ui';

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

export function CreatePoForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const create = usePurchaseOrdersControllerCreate();
  const { data: suppliers } = useSuppliersControllerList();
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

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
      await queryClient.invalidateQueries({
        queryKey: getPurchaseOrdersControllerListQueryKey(),
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
          <Label htmlFor="po-supplier">Supplier</Label>
          <SimpleSelect
            id="po-supplier"
            aria-label="Supplier"
            className="w-full"
            value={supplierId}
            onValueChange={setSupplierId}
            placeholder="Select…"
            options={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="po-warehouse">Destination warehouse</Label>
          <SimpleSelect
            id="po-warehouse"
            aria-label="Destination warehouse"
            className="w-full"
            value={warehouseId}
            onValueChange={setWarehouseId}
            placeholder="Select…"
            options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
          />
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
              <SimpleSelect
                aria-label={`Line ${i + 1} product`}
                className="w-full"
                value={line.productId}
                onValueChange={(v) => setLine(i, { productId: v })}
                placeholder="Select product…"
                options={(products ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.sku})`,
                }))}
              />
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={create.isPending}>Create draft</Button>
      </div>
    </form>
  );
}
