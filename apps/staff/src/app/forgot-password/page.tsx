'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { authControllerForgotPassword } from '@iws/api-client';
import { Input, Label } from '@iws/ui';
import { AuthBrandPanel } from '../login/auth-brand-panel';

const INPUT = 'h-11 rounded-md border-border-strong bg-surface px-3.5 text-sm';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The API always responds generically (no account enumeration); we only
      // distinguish a transport failure so the user knows to retry.
      await authControllerForgotPassword({ email, app: 'staff' });
      setSent(true);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <AuthBrandPanel />
      <div className="grid place-items-center overflow-y-auto p-8">
        <div className="w-full max-w-[382px]">
          {sent ? (
            <>
              <h1 className="text-[1.55rem] font-bold tracking-[-0.025em]">Check your inbox</h1>
              <p role="status" className="mt-[0.6rem] text-[13.5px] text-muted-foreground">
                If an account exists for that email, we’ve sent a password reset
                link. It expires in 1 hour and can be used once.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-[13px] font-semibold text-primary-2"
              >
                ← Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h1 className="text-[1.55rem] font-bold tracking-[-0.025em]">Forgot your password?</h1>
              <p className="mt-[0.35rem] mb-[1.6rem] text-[13.5px] text-muted-foreground">
                Enter your work email and we’ll send you a reset link.
              </p>

              <div className="mb-[1.05rem]">
                <Label htmlFor="email" className="mb-[0.42rem] block text-[12.5px] font-medium">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className={INPUT}
                  required
                />
              </div>

              {error && (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-[46px] w-full items-center justify-center rounded-md bg-primary text-[14.5px] font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="mt-[1.35rem] text-center text-[13px] text-muted-foreground">
                Remembered it?{' '}
                <Link href="/login" className="font-semibold text-primary-2">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
