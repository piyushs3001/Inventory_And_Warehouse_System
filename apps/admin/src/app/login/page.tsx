'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@iws/auth';
import type { ErrorResponseDto, ErrorType } from '@iws/api-client';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';

// Admin Portal login — sign-in only. Admin/Manager accounts are provisioned by a
// Super Admin (self-registration creates STAFF accounts and lives on the Staff app).
const STAFF_APP_URL = process.env.NEXT_PUBLIC_STAFF_URL ?? 'http://localhost:5000';
const INPUT = 'h-11 rounded-md border-border-strong bg-surface px-3.5 text-sm';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stay, setStay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await login(email, password);
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ===== Brand art panel (decorative; hidden under lg) ===== */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg, var(--primary-2), var(--primary) 55%, color-mix(in oklch, var(--primary) 60%, black))',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[110px] -right-[120px] z-0 size-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(1 0 0 / 0.26), transparent 60%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[120px] -left-[130px] z-0 size-[340px] rounded-full opacity-45"
          style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--brand-accent) 70%, transparent), transparent 60%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(oklch(1 0 0 / 0.08) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.08) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
            maskImage: 'radial-gradient(135% 100% at 72% 6%, black, transparent 72%)',
          }}
        />

        <div className="relative z-[2] flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-[10px] border border-white/30 bg-white/15 backdrop-blur">▦</span>
          IWS
        </div>

        <div className="relative z-[2] max-w-sm">
          <p className="font-mono text-[11.5px] tracking-[0.16em] uppercase opacity-80">Admin Portal</p>
          <h2 className="mt-3 mb-6 max-w-[13ch] text-[2.05rem] leading-[1.1] font-bold tracking-[-0.025em]">
            Oversee every warehouse from one place.
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm opacity-95">
            {[
              'Configure warehouses, users & permissions',
              'Approve transfers, POs & access requests',
              'Reports, forecasting & AI — review-first',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-[21px] shrink-0 place-items-center rounded-md bg-white/20">
                  <Check className="size-[13px]" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="pointer-events-none absolute top-[31%] right-6 z-[1] hidden w-[230px] xl:block">
          <div className="absolute top-[-20px] right-[10px] w-[165px] rounded-[14px] border border-white/20 bg-white/[0.13] p-[0.8rem_0.95rem] shadow-[0_18px_44px_-14px_oklch(0_0_0/0.45)] backdrop-blur-md animate-floaty">
            <div className="text-[11px] font-medium opacity-80">Stock value</div>
            <div className="mt-0.5 font-mono text-[1.4rem] font-semibold">$4.82M</div>
          </div>
          <div
            className="absolute top-[120px] right-[90px] flex w-[215px] items-center gap-2.5 rounded-[14px] border border-white/20 bg-white/[0.13] p-[0.8rem_0.95rem] shadow-[0_18px_44px_-14px_oklch(0_0_0/0.45)] backdrop-blur-md animate-floaty"
            style={{ animationDelay: '1.6s' }}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-[9px]"
              style={{ background: 'color-mix(in oklch, var(--warn) 65%, white)', color: 'oklch(0.32 0.1 70)' }}
            >
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <div className="text-[12.5px] font-semibold">23 low-stock alerts</div>
              <div className="text-[11px] font-medium opacity-80">+5 this week</div>
            </div>
          </div>
          <div
            className="absolute top-[236px] right-[-6px] flex w-[205px] items-center gap-2.5 rounded-[14px] border border-white/20 bg-white/[0.13] p-[0.8rem_0.95rem] text-[12.5px] shadow-[0_18px_44px_-14px_oklch(0_0_0/0.45)] backdrop-blur-md animate-floaty"
            style={{ animationDelay: '3.1s' }}
          >
            <span
              className="grid size-[26px] shrink-0 place-items-center rounded-[7px]"
              style={{ background: 'color-mix(in oklch, var(--ok) 60%, white)', color: 'oklch(0.3 0.1 155)' }}
            >
              <Check className="size-4" />
            </span>
            <div>
              <div className="font-semibold">3 transfers approved</div>
              <div className="text-[11px] font-medium opacity-80">awaiting receipt</div>
            </div>
          </div>
        </div>

        <div className="relative z-[2] flex gap-9 text-[12.5px] opacity-80">
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">6</span>Warehouses
          </div>
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">2,847</span>Products
          </div>
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">14</span>Pending POs
          </div>
        </div>
      </aside>

      {/* ===== Auth card (sign-in only) ===== */}
      <div className="grid place-items-center overflow-y-auto p-8">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-[382px]">
          <h1 className="text-[1.55rem] font-bold tracking-[-0.025em]">Admin sign in</h1>
          <p className="mt-[0.35rem] mb-[1.6rem] text-[13.5px] text-muted-foreground">Sign in to the IWS Admin Portal.</p>

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
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
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

          <p className="mt-[1.35rem] text-center text-[13px] text-muted-foreground">
            Staff member?{' '}
            <a href={STAFF_APP_URL} className="font-semibold text-primary-2">
              Go to the Staff app
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
