'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWarehousesControllerList } from '@/lib/api/generated/warehouses/warehouses';

export function WarehouseSwitcher() {
  const { data } = useWarehousesControllerList();
  // data is the array directly (same shape as admin/warehouses/page.tsx uses it)
  const warehouses = data ?? [];
  // TODO: lift selectedId into a shared warehouse context when the real scope switcher lands.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = warehouses.find((w) => w.id === selectedId) ?? warehouses[0];
  if (!current) return null;
  return (
    <button
      type="button"
      className="flex h-[38px] items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 text-left"
      aria-label="Switch warehouse"
      onClick={() => {
        const idx = warehouses.findIndex((w) => w.id === current.id);
        setSelectedId(warehouses[(idx + 1) % warehouses.length]?.id ?? null);
      }}
    >
      <span className="size-1.5 rounded-full bg-ok" aria-hidden />
      <span className="leading-tight">
        <span className="block font-mono text-[9.5px] tracking-wide text-faint uppercase">Warehouse</span>
        <span className="block text-[12.5px] font-semibold">{current.name}</span>
      </span>
      <ChevronDown className="size-4 text-faint" aria-hidden />
    </button>
  );
}
