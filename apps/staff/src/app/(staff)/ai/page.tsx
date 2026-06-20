'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  useAiControllerChat,
  useAiControllerReorder,
} from '@iws/api-client';
import type { ChatResponseDto } from '@iws/api-client';
import {
  PageHead, Button, Input, Skeleton, EmptyState, StatusBadge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const CARD = 'rounded-[16px] bg-card p-5 ring-1 ring-foreground/10';

export default function StaffAiPage() {
  const chat = useAiControllerChat();
  const [question, setQuestion] = useState('');
  const [res, setRes] = useState<ChatResponseDto | null>(null);
  const { data: reorder, isLoading } = useAiControllerReorder();
  const list = reorder ?? [];

  const ask = async (): Promise<void> => {
    if (!question.trim()) return;
    setRes(await chat.mutateAsync({ data: { question } }));
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Assistant"
        description="Advisory only — suggestions over your warehouse stock."
      />

      <section className={CARD}>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Ask about your stock</h2>
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
          </div>
        )}
      </section>

      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Reorder suggestions</h2>
          <StatusBadge tone="brand">Suggestion</StatusBadge>
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : list.length === 0 ? (
          <EmptyState title="Nothing to reorder" description="No products are at or below their reorder level for your warehouse(s)." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Suggested</TableHead>
                  <TableHead className="text-right">Days left</TableHead>
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
                    <TableCell className="text-right font-semibold tabular-nums">{s.suggestedQty}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.daysToStockout ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
