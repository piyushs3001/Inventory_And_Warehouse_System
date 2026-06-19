'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@iws/auth';
import { getAccessRole, Role } from '@iws/api-client';
import type { ErrorResponseDto, ErrorType } from '@iws/api-client';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';

// Admin Portal login — sign-in only, on a distinct dark "console" layout.
// Admin/Manager accounts are provisioned by a Super Admin; self-registration
// (which creates STAFF accounts) lives on the Staff app.
const ADMIN_ROLES: string[] = [Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER];
const STAFF_APP_URL = process.env.NEXT_PUBLIC_STAFF_URL ?? 'http://localhost:5000';
const INPUT = 'h-11 rounded-md border-border-strong bg-surface px-3.5 text-sm';

export default function AdminLoginPage() {
  const { login, logout } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stay, setStay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wrongApp, setWrongApp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setWrongApp(false);
    setSubmitting(true);
    try {
      await login(email, password);
      // Credentials are valid — but is this account allowed in the Admin Portal?
      const role = getAccessRole();
      if (role && !ADMIN_ROLES.includes(role)) {
        await logout();
        setError('This account doesn’t have access to the Admin Portal.');
        setWrongApp(true);
        return;
      }
      router.replace('/');
    } catch (err) {
      const ex = err as ErrorType<ErrorResponseDto>;
      const status = ex.response?.status;
      const apiMessage = typeof ex.response?.data?.message === 'string' ? ex.response.data.message : undefined;
      if (!ex.response) {
        setError('Unable to reach the server. Please try again.');
      } else if (status === 401) {
        setError(apiMessage ?? 'Invalid credentials');
      } else {
        setError(apiMessage ?? 'Sign in failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      {/* Deep brand backdrop — distinct "secure console" feel vs the Staff app's
          split-screen marketing layout. Mixing toward BLACK is hue-safe. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, color-mix(in oklch, var(--primary) 72%, black), color-mix(in oklch, var(--primary) 32%, black))',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[160px] left-1/2 size-[520px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, oklch(1 0 0 / 0.18), transparent 60%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(120% 90% at 50% 0%, black, transparent 75%)',
        }}
      />

      {/* Centered console card */}
      <div className="relative z-10 w-full max-w-[400px] rounded-[18px] border border-border bg-surface p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-[14px] bg-gradient-to-br from-primary to-primary-2 text-[20px] font-bold text-primary-foreground shadow-[0_8px_24px_var(--brand-glow)]">
            ▦
          </span>
          <span className="rounded-full bg-primary-tint px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.14em] text-primary-2 uppercase">
            Admin Portal
          </span>
          <h1 className="mt-3 text-[1.5rem] font-bold tracking-[-0.025em]">Sign in to continue</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Restricted to administrators &amp; managers.</p>
        </div>

        <form onSubmit={onSubmit} noValidate>
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

          <div className="mb-[1.05rem]">
            <Label htmlFor="password" className="mb-[0.42rem] block text-[12.5px] font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${INPUT} pr-11`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-[0.4rem] grid size-[34px] -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          <div className="mt-[0.1rem] mb-[1.35rem] flex items-center justify-between text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-[0.45rem] text-muted-foreground">
              <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} className="accent-primary" />
              Stay signed in
            </label>
            <button type="button" onClick={() => setNotice('Password reset isn’t available yet — contact a Super Admin.')} className="font-medium text-primary-2">
              Forgot password?
            </button>
          </div>

          {error && (
            <p role="alert" className="mb-1 text-sm text-destructive">
              {error}
            </p>
          )}
          {wrongApp && (
            <p className="mb-3 text-[12.5px] text-muted-foreground">
              Looks like a staff account.{' '}
              <a href={STAFF_APP_URL} className="font-semibold text-primary-2">
                Open the Staff app →
              </a>
            </p>
          )}
          {notice && <p className="mb-3 text-[12.5px] text-muted-foreground">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-[46px] w-full items-center justify-center rounded-md bg-primary text-[14.5px] font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="my-[1.15rem] flex items-center gap-[0.85rem] text-xs text-faint before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            or
          </div>

          <button
            type="button"
            onClick={() => setNotice('Single sign-on isn’t configured yet.')}
            className="flex h-11 w-full items-center justify-center gap-[0.6rem] rounded-md border border-border-strong bg-surface text-sm font-medium text-foreground transition-colors hover:border-muted-foreground hover:bg-surface-2"
          >
            <Shield className="size-4" aria-hidden /> Continue with SSO
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Staff member?{' '}
          <a href={STAFF_APP_URL} className="font-semibold text-primary-2">
            Go to the Staff app
          </a>
        </p>
      </div>
    </main>
  );
}
