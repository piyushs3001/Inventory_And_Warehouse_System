'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategoriesControllerCreate,
  useCategoriesControllerUpdate,
  getCategoriesControllerListQueryKey,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
import { Button, FormActions, FormField, Input, SimpleCombobox } from '@iws/ui';

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
  const router = useRouter();
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
      <FormField label="Name" htmlFor="cat-name" required>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Parent category" htmlFor="cat-parent">
        <SimpleCombobox
          aria-label="Parent category"
          className="w-full"
          value={parentId}
          onValueChange={setParentId}
          searchPlaceholder="Search categories…"
          options={[
            { value: '', label: 'None (root)' },
            ...parentOptions.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/categories')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </FormActions>
    </form>
  );
}
