'use client';

import { useState, type FormEvent } from 'react';
import {
  useCategoriesControllerCreate,
  useCategoriesControllerUpdate,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
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

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save category';
}

export function CategoryFormDialog({
  category,
  categories,
  onClose,
  onSuccess,
}: {
  category?: CategoryDto;
  categories: CategoryDto[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const isEdit = Boolean(category);
  const create = useCategoriesControllerCreate();
  const update = useCategoriesControllerUpdate();

  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState<string>(category?.parentId ?? '');
  const [error, setError] = useState<string | null>(null);

  const isPending = create.isPending || update.isPending;
  // A category can't be its own parent; deeper cycles are caught server-side.
  const parentOptions = categories.filter((c) => c.id !== category?.id);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const data = { name, parentId: parentId || undefined };
    try {
      if (isEdit && category) {
        await update.mutateAsync({ id: category.id, data });
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
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-parent">Parent category</Label>
            <select
              id="cat-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">None (root)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
