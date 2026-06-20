'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw, FileStack } from 'lucide-react';
import {
  useAiControllerReorder,
  useAiControllerForecast,
  useAiControllerChat,
  useAiControllerGeneratePo,
} from '@iws/api-client';
import type {
  ForecastResultDto,
  ChatResponseDto,
  GeneratePoResultDto,
} from '@iws/api-client';
import {
  PageHead, Button, Input, Skeleton, EmptyState, StatusBadge, buttonVariants,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const CARD = 'rounded-[16px] bg-card p-5 ring-1 ring-foreground/10';

function SuggestionPill() {
  return (
    <StatusBadge tone="brand">Suggestion — review before acting</StatusBadge>
  );
}

export default function AiPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="AI Assistant"
        description="Advisory only — every output is a suggestion or draft a human reviews. Nothing is applied or sent automatically."
      />
      <ChatCard />
      <ReorderCard />
      <ForecastCard />
      <PoGeneratorCard />
    </div>
  );
}

function ChatCard() {
  const chat = useAiControllerChat();
  const [question, setQuestion] = useState('');
  const [res, setRes] = useState<ChatResponseDto | null>(null);

  const ask = async (): Promise<void> => {
    if (!question.trim()) return;
    const r = await chat.mutateAsync({ data: { question } });
    setRes(r);
  };

  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Chat assistant</h2>
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="Ask about your inventory"
          placeholder="e.g. How much Cola do we have?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void ask(); }}
        />
        <Button onClick={() => void ask()} disabled={chat.isPending}>Ask</Button>
      </div>
      {res && (
        <div className="mt-3 rounded-lg bg-surface-3 p-3 text-sm">
          <p>{res.answer}</p>
          {res.sources.length > 0 && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Sources: {res.sources.join(', ')}</p>
          )}
          {!res.configured && (
            <p className="mt-2 text-xs text-muted-foreground">
              Basic keyword lookup — an LLM provider is not configured, so answers are limited to direct stock lookups.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ReorderCard() {
  const { data, isLoading } = useAiControllerReorder();
  const list = data ?? [];

  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Reorder suggestions</h2>
        </div>
        <SuggestionPill />
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing to reorder" description="No products are at or below their reorder level in your scope." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-right">Days left</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={`${s.productId}:${s.warehouseId}`}>
                  <TableCell>
                    <div className="text-[13px] font-semibold">{s.productName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{s.sku}</div>
                  </TableCell>
                  <TableCell>{s.warehouseName}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.reorderLevel}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.suggestedQty}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.daysToStockout ?? '—'}</TableCell>
                  <TableCell className="max-w-[22rem] text-xs text-muted-foreground">{s.rationale}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function ForecastCard() {
  const forecast = useAiControllerForecast();
  const [days, setDays] = useState('7');
  const [res, setRes] = useState<ForecastResultDto | null>(null);

  const run = async (): Promise<void> => {
    const n = Number(days);
    const r = await forecast.mutateAsync({ data: { days: Number.isFinite(n) && n > 0 ? n : 7 } });
    setRes(r);
  };

  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Demand forecast</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Horizon (days)
            <Input className="w-20" type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <Button size="sm" onClick={() => void run()} disabled={forecast.isPending}>Run forecast</Button>
        </div>
      </div>
      {res && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-xs text-muted-foreground">
            Moving average over the last {res.lookbackDays} days · horizon {res.days} day(s). Advisory baseline.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Avg/day</TableHead>
                <TableHead className="text-right">Projected demand</TableHead>
                <TableHead>Projected stock-out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {res.items.map((it) => (
                <TableRow key={`${it.sku}:${it.warehouseName}`}>
                  <TableCell>
                    <div className="text-[13px] font-semibold">{it.productName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{it.sku}</div>
                  </TableCell>
                  <TableCell>{it.warehouseName}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.avgDailyConsumption}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.forecastDemand}</TableCell>
                  <TableCell>{it.projectedStockoutDate ? new Date(it.projectedStockoutDate).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function PoGeneratorCard() {
  const generate = useAiControllerGeneratePo();
  const [res, setRes] = useState<GeneratePoResultDto | null>(null);

  const run = async (): Promise<void> => {
    const r = await generate.mutateAsync({ data: {} });
    setRes(r);
  };

  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileStack className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">PO Generator</h2>
        </div>
        <SuggestionPill />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Turns reorder suggestions into <strong>Draft</strong> purchase orders grouped by supplier. Nothing is sent — review and send them from Purchase Orders.
      </p>
      <Button onClick={() => void run()} disabled={generate.isPending}>Generate draft POs</Button>
      {res && (
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span>{res.created.length} draft PO{res.created.length === 1 ? '' : 's'} created.</span>
            {res.created.length > 0 && (
              <Link href="/purchase-orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Review in Purchase Orders
              </Link>
            )}
          </div>
          {res.created.length > 0 && (
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {res.created.map((po) => (
                <li key={po.id}>{po.code} · {po.supplierName} → {po.warehouseName} · {po.lines.length} line(s) · {po.totalCost}</li>
              ))}
            </ul>
          )}
          {res.skipped.length > 0 && (
            <div className="rounded-lg bg-surface-3 p-3">
              <div className="text-xs font-semibold">Skipped ({res.skipped.length})</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {res.skipped.map((s, i) => (
                  <li key={i}>{s.productName}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
