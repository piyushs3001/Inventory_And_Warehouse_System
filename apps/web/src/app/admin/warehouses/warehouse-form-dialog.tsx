'use client';

import { useState, type FormEvent } from 'react';
import {
  useWarehousesControllerCreate,
  useWarehousesControllerUpdate,
} from '@iws/api-client';
import type { WarehouseDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@iws/ui';

export function WarehouseFormDialog({
  warehouse,
  onClose,
  onSuccess,
}: {
  warehouse?: WarehouseDto;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const isEdit = Boolean(warehouse);
  const create = useWarehousesControllerCreate();
  const update = useWarehousesControllerUpdate();

  const [name, setName] = useState(warehouse?.name ?? '');
  const [address, setAddress] = useState(warehouse?.address ?? '');
  const [contactPerson, setContactPerson] = useState(warehouse?.contactPerson ?? '');
  const [capacity, setCapacity] = useState<string>(
    warehouse?.capacity != null ? String(warehouse.capacity) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const isPending = create.isPending || update.isPending;

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const capacityNum = capacity !== '' ? Number(capacity) : undefined;
    try {
      if (isEdit && warehouse) {
        await update.mutateAsync({
          id: warehouse.id,
          data: {
            name,
            address: address || undefined,
            contactPerson: contactPerson || undefined,
            capacity: capacityNum,
          },
        });
      } else {
        await create.mutateAsync({
          data: {
            name,
            address: address || undefined,
            contactPerson: contactPerson || undefined,
            capacity: capacityNum,
          },
        });
      }
      await onSuccess();
      onClose();
    } catch {
      setError('Could not save warehouse');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit warehouse' : 'New warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-address">Address</Label>
            <Input
              id="wh-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-contact">Contact person</Label>
            <Input
              id="wh-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-capacity">Capacity</Label>
            <Input
              id="wh-capacity"
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
