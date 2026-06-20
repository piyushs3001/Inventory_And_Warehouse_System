'use client';

import { useState, type FormEvent } from 'react';
import { useStockCountsControllerCreate, useWarehousesControllerList } from '@iws/api-client';
import { Button, Input, Label } from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not open count session';
}

export function CountForm({ onDone }: { onDone: (id: string) => void }) {
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-warehouse">Warehouse</Label>
        <select id="ct-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select…</option>
          {options.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-notes">Notes</Label>
        <Input id="ct-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Aisle 4 audit" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending}>Open session</Button>
      </div>
    </form>
  );
}
