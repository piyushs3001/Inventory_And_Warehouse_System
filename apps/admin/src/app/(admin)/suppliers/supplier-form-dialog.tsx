'use client';

import { useState, type FormEvent } from 'react';
import {
  useSuppliersControllerCreate,
  useSuppliersControllerUpdate,
} from '@iws/api-client';
import type { SupplierDto } from '@iws/api-client';
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
  return typeof message === 'string' ? message : 'Could not save supplier';
}

export function SupplierFormDialog({
  supplier,
  onClose,
  onSuccess,
}: {
  supplier?: SupplierDto;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const isEdit = Boolean(supplier);
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
      await onSuccess();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier' : 'New supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-name">Name</Label>
            <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-contact">Contact person</Label>
            <Input id="sup-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-address">Address</Label>
            <Input id="sup-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isEdit ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
