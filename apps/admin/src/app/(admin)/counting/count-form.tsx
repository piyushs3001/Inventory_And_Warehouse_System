'use client';

import { useState, type FormEvent } from 'react';
import { useStockCountsControllerCreate, useWarehousesControllerList } from '@iws/api-client';
import { Button, FormActions, FormField, Input, SimpleCombobox } from '@iws/ui';
import { useRouter } from 'next/navigation';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not open count session';
}

export function CountForm({ onDone }: { onDone: (id: string) => void }) {
  const router = useRouter();
  const { data: warehouses } = useWarehousesControllerList();
  const create = useStockCountsControllerCreate();
  const options = warehouses ?? [];
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      const res = await create.mutateAsync({ data: { warehouseId, notes: notes || undefined } });
      onDone(res.id);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Opens a session snapshotting current system stock for every product in the chosen warehouse.
      </p>
      <FormField label="Warehouse" htmlFor="ct-warehouse" required>
        <SimpleCombobox
          id="ct-warehouse"
          aria-label="Warehouse"
          className="w-full"
          value={warehouseId}
          onValueChange={setWarehouseId}
          placeholder="Select a warehouse…"
          searchPlaceholder="Search warehouses…"
          options={options.map((w) => ({ value: w.id, label: w.name }))}
        />
      </FormField>
      <FormField label="Notes" htmlFor="ct-notes">
        <Input id="ct-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Aisle 4 audit" />
      </FormField>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/counting')}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>Open session</Button>
      </FormActions>
    </form>
  );
}
