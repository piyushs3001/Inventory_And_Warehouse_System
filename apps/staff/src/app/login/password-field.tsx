'use client';

import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, Label } from '@iws/ui';

// Inputs match the wireframe scale (44px, strong border, brand focus ring) —
// the shared <Input> default is the compact 32px form-grid size.
const INPUT = 'h-11 rounded-md border-border-strong bg-surface px-3.5 text-sm';

/** Password input with a show/hide eye toggle and an optional strength meter. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  meter = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  meter?: boolean;
}): ReactNode {
  const [show, setShow] = useState(false);
  // 0–4 bars: length, mixed case, a digit, a symbol.
  const strength = meter
    ? [
        value.length >= 8,
        /[a-z]/.test(value) && /[A-Z]/.test(value),
        /\d/.test(value),
        /[^A-Za-z0-9]/.test(value),
      ].filter(Boolean).length
    : 0;

  return (
    <div className="mb-[1.05rem]">
      <Label htmlFor={id} className="mb-[0.42rem] block text-[12.5px] font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${INPUT} pr-11`}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          title={show ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-[0.4rem] grid size-[34px] -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {meter && (
        <div className="mt-2 flex gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <i
              key={i}
              className={`h-1 flex-1 rounded-[3px] transition-colors ${i < strength ? 'bg-ok' : 'bg-surface-3'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
