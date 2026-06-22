'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useVariantsControllerList,
  useVariantsControllerCreate,
  useVariantsControllerUpdate,
  useVariantsControllerArchive,
  getVariantsControllerListQueryKey,
} from '@iws/api-client';
import type { VariantDto } from '@iws/api-client';
import { toast } from 'sonner';
import { Button, Input, Label, useConfirm } from '@iws/ui';
import { VariantBarcode } from './barcode-controls';

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not save variant';
}

type AttrRow = { id: string; key: string; value: string };

function toAttrRows(attrs: Record<string, string>): AttrRow[] {
  const rows = Object.entries(attrs).map(([key, value], i) => ({
    id: `init-${i}`,
    key,
    value,
  }));
  return rows.length > 0 ? rows : [{ id: 'init-0', key: '', value: '' }];
}

function toAttrObject(rows: AttrRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    const k = key.trim();
    if (k) out[k] = value;
  }
  return out;
}

export function VariantsSection({ productId }: { productId: string }) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: variants, isLoading } = useVariantsControllerList(
    productId,
    undefined,
  );
  const create = useVariantsControllerCreate();
  const update = useVariantsControllerUpdate();
  const archive = useVariantsControllerArchive();

  const [editing, setEditing] = useState<VariantDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<string | null>(null);

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getVariantsControllerListQueryKey(productId),
    });
  };

  const onArchive = async (id: string, sku: string): Promise<void> => {
    const ok = await confirm({
      title: 'Archive variant?',
      description: `Variant "${sku}" will be hidden from the active catalog. You can re-enable it later.`,
      confirmLabel: 'Archive',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await archive.mutateAsync({ productId, id });
      await invalidate();
      toast.success('Variant archived');
    } catch {
      toast.error('Could not archive variant');
    }
  };

  const list = variants ?? [];
  const isFormOpen = adding || editing !== null;

  return (
    <div className="flex flex-col gap-3 border-t border-foreground/10 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Variants</h3>
        {!isFormOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            Add variant
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading variants…</p>
      ) : list.length === 0 && !isFormOpen ? (
        <p className="text-sm text-muted-foreground">
          No variants yet. Add one to track size/colour and the like.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs">{v.sku}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(v.attributes).map(([k, val]) => (
                      <span
                        key={k}
                        className="rounded bg-foreground/10 px-1.5 py-0.5 text-[11px]"
                      >
                        {k}: {val}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={barcodeFor === v.id}
                    onClick={() =>
                      setBarcodeFor((cur) => (cur === v.id ? null : v.id))
                    }
                  >
                    Barcode
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdding(false);
                      setEditing(v);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive(v.id, v.sku)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
              {barcodeFor === v.id && (
                <VariantBarcode productId={productId} variantId={v.id} />
              )}
            </li>
          ))}
        </ul>
      )}

      {isFormOpen && (
        <VariantInlineForm
          variant={editing ?? undefined}
          pending={create.isPending || update.isPending}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={async (data) => {
            if (editing) {
              await update.mutateAsync({ productId, id: editing.id, data });
            } else {
              await create.mutateAsync({ productId, data });
            }
            await invalidate();
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function VariantInlineForm({
  variant,
  pending,
  onCancel,
  onSave,
}: {
  variant?: VariantDto;
  pending: boolean;
  onCancel: () => void;
  onSave: (data: {
    sku: string;
    barcode?: string;
    attributes: Record<string, string>;
  }) => Promise<void>;
}) {
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [barcode, setBarcode] = useState(variant?.barcode ?? '');
  const [attrs, setAttrs] = useState<AttrRow[]>(
    toAttrRows(variant?.attributes ?? {}),
  );
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);

  const setRow = (id: string, patch: Partial<AttrRow>): void => {
    setAttrs((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const submit = async (): Promise<void> => {
    setError(null);
    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }
    try {
      await onSave({
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        attributes: toAttrObject(attrs),
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-foreground/10 p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="var-sku">Variant SKU</Label>
        <Input
          id="var-sku"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="var-barcode">Barcode</Label>
        <Input
          id="var-barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Attributes</Label>
        {attrs.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input
              aria-label={`Attribute name ${i + 1}`}
              placeholder="e.g. size"
              value={row.key}
              onChange={(e) => setRow(row.id, { key: e.target.value })}
            />
            <Input
              aria-label={`Attribute value ${i + 1}`}
              placeholder="e.g. L"
              value={row.value}
              onChange={(e) => setRow(row.id, { value: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Remove attribute ${i + 1}`}
              onClick={() =>
                setAttrs((rows) => rows.filter((r) => r.id !== row.id))
              }
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            setAttrs((rows) => [
              ...rows,
              { id: `new-${nextId.current++}`, key: '', value: '' },
            ])
          }
        >
          Add attribute
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {variant ? 'Save variant' : 'Add variant'}
        </Button>
      </div>
    </div>
  );
}
