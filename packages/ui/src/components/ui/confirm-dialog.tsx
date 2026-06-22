'use client';

import * as React from 'react';
import { TriangleAlertIcon } from 'lucide-react';

import { cn } from '../../utils';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export type ConfirmTone = 'default' | 'warn' | 'danger';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

const toneIconClass: Record<ConfirmTone, string> = {
  default: '',
  warn: 'bg-warn-tint text-warn-ink',
  danger: 'bg-danger-tint text-destructive',
};

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const tone = options?.tone ?? 'default';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Closing via escape / backdrop counts as cancel.
          if (!next) settle(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-start gap-3">
              {tone !== 'default' && (
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                    toneIconClass[tone],
                  )}
                >
                  <TriangleAlertIcon className="size-4" />
                </span>
              )}
              <div className="flex flex-col gap-1">
                <DialogTitle>{options?.title}</DialogTitle>
                {options?.description && (
                  <DialogDescription>{options.description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" onClick={() => settle(false)}>
                  {options?.cancelLabel ?? 'Cancel'}
                </Button>
              }
            />
            <Button
              variant={tone === 'danger' ? 'destructive' : 'default'}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}
