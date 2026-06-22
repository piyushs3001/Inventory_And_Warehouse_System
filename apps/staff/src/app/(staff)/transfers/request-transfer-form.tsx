'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTransfersControllerCreate } from '@iws/api-client';
import type { ProductDto, WarehouseDto } from '@iws/api-client';
import { Button, FormActions, FormField, FormGrid, Input, SimpleCombobox } from '@iws/ui';

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
  const router = useRouter();
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
      <FormGrid cols={2}>
        <FormField label="From (your warehouse)" htmlFor="tr-source">
          <SimpleCombobox
            id="tr-source"
            aria-label="From (your warehouse)"
            className="w-full"
            value={sourceWarehouseId}
            onValueChange={setSourceWarehouseId}
            placeholder="Select…"
            searchPlaceholder="Search warehouses…"
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          />
        </FormField>
        <FormField label="To (destination)" htmlFor="tr-dest">
          <SimpleCombobox
            id="tr-dest"
            aria-label="To (destination)"
            className="w-full"
            value={destinationWarehouseId}
            onValueChange={setDestinationWarehouseId}
            placeholder="Select…"
            searchPlaceholder="Search warehouses…"
            options={warehouses
              .filter((w) => w.id !== sourceWarehouseId)
              .map((w) => ({ value: w.id, label: w.name }))}
          />
        </FormField>
      </FormGrid>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium leading-none">Lines</span>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2">
            <SimpleCombobox
              aria-label={`Line ${i + 1} product`}
              className="w-full"
              value={line.productId}
              onValueChange={(v) => setLine(i, { productId: v })}
              placeholder="Select product…"
              searchPlaceholder="Search products…"
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.sku})`,
                keywords: p.sku,
              }))}
            />
            <Input aria-label={`Line ${i + 1} quantity`} type="number" min={1} placeholder="Qty"
              value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <Button type="button" variant="outline" size="sm" disabled={lines.length === 1} onClick={() => removeLine(i)} aria-label={`Remove line ${i + 1}`}>×</Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLine}>Add line</Button>
      </div>

      <FormField label="Notes" htmlFor="tr-notes">
        <Input id="tr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/transfers')}>Cancel</Button>
        <Button type="submit" disabled={create.isPending}>Request</Button>
      </FormActions>
    </form>
  );
}
