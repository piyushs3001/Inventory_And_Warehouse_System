'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategoriesControllerCreate,
  useCategoriesControllerUpdate,
  getCategoriesControllerListQueryKey,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';
import { SimpleSelect } from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save category';
}

export function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category?: CategoryDto;
  categories: CategoryDto[];
  onDone: () => void;
}) {
  const isEdit = Boolean(category);
  const queryClient = useQueryClient();
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
      await queryClient.invalidateQueries({
        queryKey: getCategoriesControllerListQueryKey(),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
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
        <SimpleSelect
          aria-label="Parent category"
          className="w-full"
          value={parentId}
          onValueChange={setParentId}
          options={[
            { value: '', label: 'None (root)' },
            ...parentOptions.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
