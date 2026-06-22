'use client';

import { useState, type FormEvent } from 'react';
import {
  useProductsControllerCreate,
  useProductsControllerUpdate,
  useCategoriesControllerList,
} from '@iws/api-client';
import type { ProductDto } from '@iws/api-client';
import { Button, FormActions, FormField, FormGrid, Input, SimpleCombobox } from '@iws/ui';
import { useRouter } from 'next/navigation';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save product';
}

function toNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function ProductForm({
  product,
  onDone,
}: {
  product?: ProductDto;
  onDone: () => void;
}) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const create = useProductsControllerCreate();
  const update = useProductsControllerUpdate();
  const { data: categories } = useCategoriesControllerList();

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? '');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice ?? '');
  const [reorderLevel, setReorderLevel] = useState(
    product?.reorderLevel != null ? String(product.reorderLevel) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const isPending = create.isPending || update.isPending;

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    const data = {
      name,
      sku,
      description: description || undefined,
      unit: unit || undefined,
      categoryId: categoryId || undefined,
      costPrice: toNumber(costPrice),
      sellingPrice: toNumber(sellingPrice),
      reorderLevel: toNumber(reorderLevel),
    };
    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, data });
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
      <FormField label="Name" htmlFor="prod-name" required>
        <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormGrid cols={2}>
        <FormField label="SKU" htmlFor="prod-sku" required>
          <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </FormField>
        <FormField label="Category" htmlFor="prod-category">
          <SimpleCombobox
            aria-label="Category"
            className="w-full"
            value={categoryId}
            onValueChange={setCategoryId}
            searchPlaceholder="Search categories…"
            options={[
              { value: '', label: 'None' },
              ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FormField>
      </FormGrid>
      <FormField label="Unit" htmlFor="prod-unit">
        <Input id="prod-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. piece, box, kg" />
      </FormField>
      <FormGrid cols={3}>
        <FormField label="Cost price" htmlFor="prod-cost">
          <Input id="prod-cost" type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        </FormField>
        <FormField label="Selling price" htmlFor="prod-sell">
          <Input id="prod-sell" type="number" min={0} step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
        </FormField>
        <FormField label="Reorder level" htmlFor="prod-reorder">
          <Input id="prod-reorder" type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </FormField>
      </FormGrid>
      <FormField label="Description" htmlFor="prod-desc">
        <Input id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.push('/products')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </FormActions>
    </form>
  );
}
