'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategoriesControllerList,
  useCategoriesControllerRemove,
  getCategoriesControllerListQueryKey,
} from '@iws/api-client';
import type { CategoryDto } from '@iws/api-client';
import { toast } from 'sonner';
import {
  buttonVariants,
  PageHead,
  EmptyState,
  EntityAvatar,
  DataTable,
  RowActions,
  useConfirm,
  type DataTableColumn,
} from '@iws/ui';

export default function CategoriesPage() {
  const confirm = useConfirm();

  const { data: categories, isLoading } = useCategoriesControllerList();

  const queryClient = useQueryClient();
  const remove = useCategoriesControllerRemove();

  const list = categories ?? [];
  const nameById = new Map(list.map((c) => [c.id, c.name]));
  const parentName = (c: CategoryDto): string =>
    c.parentId ? (nameById.get(c.parentId) ?? '—') : '—';

  const onDelete = async (id: string, name: string): Promise<void> => {
    const ok = await confirm({
      title: 'Delete category?',
      description: `"${name}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      await queryClient.invalidateQueries({
        queryKey: getCategoriesControllerListQueryKey(),
      });
      toast.success('Category deleted');
    } catch {
      toast.error('Could not delete category');
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
        <RowActions
          editHref={`/categories/${c.id}/edit`}
          onDelete={() => onDelete(c.id, c.name)}
          labels={{ delete: 'Delete' }}
        />
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
