'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  authControllerResetPassword,
  authControllerValidateResetToken,
} from '@iws/api-client';
import { PasswordField } from '../login/password-field';
import { AuthBrandPanel } from '../login/auth-brand-panel';

type TokenState = 'checking' | 'valid' | 'invalid';

function ResetPasswordInner() {
  const token = useSearchParams().get('token') ?? '';
  const [tokenState, setTokenState] = useState<TokenState>(
    token ? 'checking' : 'invalid',
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    authControllerValidateResetToken({ token })
      .then((res) => {
        if (active) setTokenState(res.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (active) setTokenState('invalid');
      });
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authControllerResetPassword({ token, password });
      setDone(true);
    } catch {
      // A bad/expired token comes back as a 4xx; flip to the invalid state.
      setTokenState('invalid');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <AuthBrandPanel />
      <div className="grid place-items-center overflow-y-auto p-8">
        <div className="w-full max-w-[382px]">
          <span className="mb-3 inline-block rounded-full bg-primary-tint px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.14em] text-primary-2 uppercase lg:hidden">
            Admin Portal
          </span>
          {done ? (
            <>
              <h1 className="text-[1.6rem] font-bold tracking-[-0.025em]">Password updated</h1>
              <p role="status" className="mt-[0.6rem] text-[13.5px] text-muted-foreground">
                Your password has been updated. You can now sign in with your new
                password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-[13px] font-semibold text-primary-2"
              >
                Go to sign in →
              </Link>
            </>
          ) : tokenState === 'invalid' ? (
            <>
              <h1 className="text-[1.6rem] font-bold tracking-[-0.025em]">Link expired</h1>
              <p className="mt-[0.6rem] text-[13.5px] text-muted-foreground">
                This password reset link is invalid or has expired. Request a new
                one to continue.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-block text-[13px] font-semibold text-primary-2"
              >
                Request a new link →
              </Link>
            </>
          ) : tokenState === 'checking' ? (
            <p className="text-[13.5px] text-muted-foreground">Checking your link…</p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h1 className="text-[1.6rem] font-bold tracking-[-0.025em]">Set a new password</h1>
              <p className="mt-[0.35rem] mb-[1.6rem] text-[13.5px] text-muted-foreground">
                Choose a strong password you don’t use elsewhere.
              </p>

              <PasswordField
                id="new-password"
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                meter
              />
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />

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
                {submitting ? 'Updating…' : 'Reset password'}
              </button>

              <p className="mt-[1.35rem] text-center text-[13px] text-muted-foreground">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
