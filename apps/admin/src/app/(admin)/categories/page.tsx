'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategoriesControllerList,
  useCategoriesControllerRemove,
  getCategoriesControllerListQueryKey,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { CategoryFormDialog } from './category-form-dialog';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not delete category';
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategoriesControllerList();
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const remove = useCategoriesControllerRemove();

  const list = categories ?? [];
  const nameById = new Map(list.map((c) => [c.id, c.name]));

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getCategoriesControllerListQueryKey(),
    });
  };

  const onDelete = async (id: string): Promise<void> => {
    if (!confirm('Delete this category?')) return;
    setError(null);
    try {
      await remove.mutateAsync({ id });
      await invalidateList();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Categories"
        actions={<Button onClick={() => setCreating(true)}>New category</Button>}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No categories"
          description="Create a category to organize the product catalog."
          action={<Button onClick={() => setCreating(true)}>New category</Button>}
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={c.name} />
                      <div className="text-[13px] font-semibold">{c.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.parentId ? (nameById.get(c.parentId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(c)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => onDelete(c.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <CategoryFormDialog
          categories={list}
          onClose={() => setCreating(false)}
          onSuccess={invalidateList}
        />
      )}
      {editing && (
        <CategoryFormDialog
          category={editing}
          categories={list}
          onClose={() => setEditing(null)}
          onSuccess={invalidateList}
        />
      )}
    </div>
  );
}
