'use client';

import { useState } from 'react';
import { useReportsControllerRun, useAiControllerSummarize } from '@iws/api-client';
import type { ReportDto, ReportSummaryDto } from '@iws/api-client';
import {
  PageHead, Button, Skeleton, EmptyState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const TYPES = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'warehouse', label: 'Warehouse' },
] as const;

function downloadCsv(report: ReportDto): void {
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = report.columns.map((c) => esc(c.label)).join(',');
  const body = report.rows
    .map((row) => report.columns.map((c) => esc(row[c.key])).join(','))
    .join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.type}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('inventory');
  const { data, isLoading } = useReportsControllerRun(type);
  const summarize = useAiControllerSummarize();
  const [summary, setSummary] = useState<ReportSummaryDto | null>(null);

  const onSummarize = async (): Promise<void> => {
    const s = await summarize.mutateAsync({ data: { type } });
    setSummary(s);
  };

  // Reset any stale summary when the selected report changes.
  const selectType = (key: (typeof TYPES)[number]['key']): void => {
    setType(key);
    setSummary(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Reports"
        description="Scope-filtered. Export as CSV (PDF/Excel coming with object storage)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!data || summarize.isPending} onClick={() => void onSummarize()}>
              Summarize
            </Button>
            <Button variant="outline" disabled={!data} onClick={() => data && downloadCsv(data)}>
              Export CSV
            </Button>
          </div>
        }
      />

      {summary && summary.type === type && (
        <div className="rounded-xl bg-primary-tint p-4 ring-1 ring-primary/20">
          <div className="mb-1 text-xs font-semibold text-primary">
            AI summary{summary.llmEnhanced ? '' : ' (figure-based, no LLM configured)'}
          </div>
          <p className="text-sm">{summary.summary}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={type === t.key ? 'default' : 'outline'}
            onClick={() => selectType(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.summary).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-card px-4 py-2 ring-1 ring-foreground/10">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="font-mono text-lg font-semibold tabular-nums">{String(v)}</div>
              </div>
            ))}
          </div>

          {data.rows.length === 0 ? (
            <EmptyState title="No data" description="This report has no rows for your scope." />
          ) : (
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.columns.map((c) => (
                      <TableHead key={c.key} className={c.numeric ? 'text-right' : undefined}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {data.columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={c.numeric ? 'text-right font-mono tabular-nums' : undefined}
                        >
                          {String(row[c.key] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
