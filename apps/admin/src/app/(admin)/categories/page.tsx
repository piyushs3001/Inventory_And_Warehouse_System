'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategoriesControllerList,
  useCategoriesControllerRemove,
  getCategoriesControllerListQueryKey,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { DataTable, type DataTableColumn } from '@iws/ui';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not delete category';
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategoriesControllerList();
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const remove = useCategoriesControllerRemove();

  const list = categories ?? [];
  const nameById = new Map(list.map((c) => [c.id, c.name]));
  const parentName = (c: CategoryDto): string =>
    c.parentId ? (nameById.get(c.parentId) ?? '—') : '—';

  const onDelete = async (id: string): Promise<void> => {
    if (!confirm('Delete this category?')) return;
    setError(null);
    try {
      await remove.mutateAsync({ id });
      await queryClient.invalidateQueries({
        queryKey: getCategoriesControllerListQueryKey(),
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const columns: DataTableColumn<CategoryDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={c.name} />
          <span className="text-[13px] font-semibold">{c.name}</span>
        </div>
      ),
      sortValue: (c) => c.name,
    },
    {
      key: 'parent',
      header: 'Parent',
      cell: (c) => parentName(c),
      sortValue: (c) => parentName(c),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <Link
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            href={`/categories/${c.id}/edit`}
          >
            Edit
          </Link>
          <Button variant="outline" size="sm" onClick={() => onDelete(c.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Categories"
        actions={
          <Link className={buttonVariants()} href="/categories/new">
            New category
          </Link>
        }
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <DataTable
        rows={list}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search categories…"
        searchFilter={(c, q) => c.name.toLowerCase().includes(q)}
        empty={
          <EmptyState
            title="No categories"
            description="Create a category to organize the product catalog."
            action={
              <Link className={buttonVariants()} href="/categories/new">
                New category
              </Link>
            }
          />
        }
      />
    </div>
  );
}
