'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSuppliersControllerCreate,
  useSuppliersControllerUpdate,
} from '@iws/api-client';
import type { SupplierDto } from '@iws/api-client';
import { Button, FormActions, FormField, FormGrid, Input } from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save supplier';
}

export function SupplierForm({
  supplier,
  onDone,
}: {
  supplier?: SupplierDto;
  onDone: () => void;
}) {
  const isEdit = Boolean(supplier);
  const router = useRouter();
  const create = useSuppliersControllerCreate();
  const update = useSuppliersControllerUpdate();

  const [name, setName] = useState(supplier?.name ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [error, setError] = useState<string | null>(null);

  const isPending = create.isPending || update.isPending;

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const data = {
      name,
      contactName: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    };
    try {
      if (isEdit && supplier) {
        await update.mutateAsync({ id: supplier.id, data });
      } else {
        await create.mutateAsync({ data });
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="sup-name" required>
        <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="Contact person" htmlFor="sup-contact">
        <Input id="sup-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </FormField>
      <FormGrid cols={2}>
        <FormField label="Email" htmlFor="sup-email">
          <Input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Phone" htmlFor="sup-phone">
          <Input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
      </FormGrid>
      <FormField label="Address" htmlFor="sup-address">
        <Input id="sup-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/suppliers')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </FormActions>
    </form>
  );
}
