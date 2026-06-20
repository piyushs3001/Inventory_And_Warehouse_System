'use client';

import { useState, type FormEvent } from 'react';
import {
  useProductsControllerCreate,
  useProductsControllerUpdate,
} from '@iws/api-client';
import type { CategoryDto, ProductDto } from '@iws/api-client';
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
import { VariantsSection } from './variants-section';
import { ProductBarcode } from './barcode-controls';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save product';
}

function toNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function ProductFormDialog({
  product,
  categories,
  onClose,
  onSuccess,
}: {
  product?: ProductDto;
  categories: CategoryDto[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const isEdit = Boolean(product);
  const create = useProductsControllerCreate();
  const update = useProductsControllerUpdate();

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
  const [showBarcode, setShowBarcode] = useState(false);

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
          <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prod-name">Name</Label>
            <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prod-sku">SKU</Label>
            <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prod-category">Category</Label>
            <select
              id="prod-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prod-unit">Unit</Label>
            <Input id="prod-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. piece, box, kg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="prod-cost">Cost price</Label>
              <Input id="prod-cost" type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prod-sell">Selling price</Label>
              <Input id="prod-sell" type="number" min={0} step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prod-reorder">Reorder level</Label>
              <Input id="prod-reorder" type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prod-desc">Description</Label>
            <Input id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isEdit ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
        {isEdit && product && (
          <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Product barcode</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={showBarcode}
                onClick={() => setShowBarcode((v) => !v)}
              >
                {showBarcode ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showBarcode && <ProductBarcode productId={product.id} />}
          </div>
        )}
        {isEdit && product && <VariantsSection productId={product.id} />}
      </DialogContent>
    </Dialog>
  );
}
