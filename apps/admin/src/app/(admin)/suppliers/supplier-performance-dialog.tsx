'use client';

import { useSuppliersControllerPerformance } from '@iws/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@iws/ui';

function pct(ratio: number | null): string {
  return ratio == null ? '—' : `${(ratio * 100).toFixed(1)}%`;
}

export function SupplierPerformanceDialog({
  supplierId,
  supplierName,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSuppliersControllerPerformance(supplierId);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Performance · {supplierName}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Metric label="Total orders" value={String(data.totalOrders)} />
            <Metric label="Completed" value={String(data.completedOrders)} />
            <Metric label="Units ordered" value={String(data.unitsOrdered)} />
            <Metric label="Units received" value={String(data.unitsReceived)} />
            <Metric label="Units damaged" value={String(data.unitsDamaged)} />
            <Metric label="Quantity accuracy" value={pct(data.quantityAccuracy)} />
            <Metric label="Damage rate" value={pct(data.damageRate)} />
            <Metric label="On-time rate" value={pct(data.onTimeRate)} />
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
