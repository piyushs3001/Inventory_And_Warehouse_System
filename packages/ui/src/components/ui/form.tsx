'use client';

import * as React from 'react';

import { cn } from '../../utils';
import { Label } from './label';

export function FormCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl bg-card p-6 ring-1 ring-foreground/10', className)}
      {...props}
    />
  );
}

export function FormGrid({
  className,
  cols = 2,
  ...props
}: React.ComponentProps<'div'> & { cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        className,
      )}
      {...props}
    />
  );
}

export function FormActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex justify-end gap-2 pt-2', className)} {...props} />
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  helper,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p className="text-sm text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
