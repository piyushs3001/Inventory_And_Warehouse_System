'use client';

import { useState, type FormEvent } from 'react';
import { useStockCountsControllerCreate } from '@iws/api-client';
import type { WarehouseDto } from '@iws/api-client';
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
  return typeof message === 'string' ? message : 'Could not open count session';
}

export function CreateCountDialog({
  warehouses,
  onClose,
  onSuccess,
}: {
  warehouses: WarehouseDto[];
  onClose: () => void;
  onSuccess: (id: string) => Promise<void>;
}) {
  const create = useStockCountsControllerCreate();
  const [warehouseId, setWarehouseId] = useState(warehouses.length === 1 ? warehouses[0].id : '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      const res = await create.mutateAsync({ data: { warehouseId, notes: notes || undefined } });
      await onSuccess(res.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New stock count</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Opens a session snapshotting current system stock for every product in the chosen warehouse.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ct-warehouse">Warehouse</Label>
            <select id="ct-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select…</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ct-notes">Notes</Label>
            <Input id="ct-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Aisle 4 audit" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Open session</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
