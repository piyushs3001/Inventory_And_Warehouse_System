'use client';

import { useState, type FormEvent } from 'react';
import {
  useWarehousesControllerCreate,
  useWarehousesControllerUpdate,
} from '@iws/api-client';
import type { WarehouseDto } from '@iws/api-client';
import { Button, FormActions, FormField, FormGrid, Input } from '@iws/ui';
import { useRouter } from 'next/navigation';

export function WarehouseForm({
  warehouse,
  onDone,
}: {
  warehouse?: WarehouseDto;
  onDone: () => void;
}) {
  const isEdit = Boolean(warehouse);
  const router = useRouter();
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
      onDone();
    } catch {
      setError('Could not save warehouse');
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="wh-name" required>
        <Input
          id="wh-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Address" htmlFor="wh-address">
        <Input
          id="wh-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </FormField>
      <FormGrid cols={2}>
        <FormField label="Contact person" htmlFor="wh-contact">
          <Input
            id="wh-contact"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </FormField>
        <FormField label="Capacity" htmlFor="wh-capacity">
          <Input
            id="wh-capacity"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </FormField>
      </FormGrid>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/warehouses')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </FormActions>
    </form>
  );
}
