'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@iws/auth';
import { getAccessRole, Role } from '@iws/api-client';
import type { ErrorResponseDto, ErrorType } from '@iws/api-client';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';

// Admin Portal login — sign-in only, on a split-screen layout that echoes the
// Staff app but reads as the admin surface: an austere "command console" brand
// panel (no marketing cards) beside a clean sign-in card. Admin/Manager accounts
// are provisioned by a Super Admin; self-registration (which creates STAFF
// accounts) lives on the Staff app.
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ===== Brand panel (austere "command console"; hidden under lg) ===== */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        {/* Deep brand gradient — mixed toward BLACK (hue-safe; the design rule
            only forbids mixing toward WHITE). Pushed darker than the Staff panel
            for a "secure console" weight. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg, color-mix(in oklch, var(--primary) 80%, black), var(--primary) 46%, color-mix(in oklch, var(--primary) 36%, black))',
          }}
        />
        {/* Single masked corner glow — restrained vs the Staff panel's pair. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[120px] -right-[120px] z-0 size-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(1 0 0 / 0.20), transparent 60%)' }}
        />
        {/* Grid texture, masked to the top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(oklch(1 0 0 / 0.07) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(130% 95% at 74% 6%, black, transparent 72%)',
          }}
        />

        {/* Brandmark + Admin Portal badge */}
        <div className="relative z-[2] flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-[10px] border border-white/30 bg-white/15 backdrop-blur">▦</span>
          IWS
          <span className="ml-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.14em] uppercase backdrop-blur">
            Admin Portal
          </span>
        </div>

        {/* Austere hero — one bold line, no checklist, no floating cards */}
        <div className="relative z-[2] max-w-sm">
          <p className="font-mono text-[11.5px] tracking-[0.16em] uppercase opacity-80">Inventory &amp; Warehouse System</p>
          <h2 className="mt-3 max-w-[13ch] text-[2.05rem] leading-[1.1] font-bold tracking-[-0.025em]">
            Command over every warehouse.
          </h2>
        </div>

        {/* Quiet governance footer (decorative) */}
        <div className="relative z-[2] flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] tracking-[0.06em] uppercase opacity-75">
          <span>Role-scoped access</span>
          <span aria-hidden className="opacity-50">·</span>
          <span>Audit-logged</span>
          <span aria-hidden className="opacity-50">·</span>
          <span>Approvals-first</span>
        </div>
      </aside>

      {/* ===== Sign-in card ===== */}
      <div className="grid place-items-center overflow-y-auto p-8">
        <div className="w-full max-w-[382px]">
          <div className="mb-7">
            {/* Identity badge — the panel carries this above lg; show it on the
                card below lg so the admin surface stays recognizable on mobile. */}
            <span className="mb-3 inline-block rounded-full bg-primary-tint px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.14em] text-primary-2 uppercase lg:hidden">
              Admin Portal
            </span>
            <h1 className="text-[1.6rem] font-bold tracking-[-0.025em]">Sign in to continue</h1>
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
          </form>

          <p className="mt-6 text-[13px] text-muted-foreground">
            Staff member?{' '}
            <a href={STAFF_APP_URL} className="font-semibold text-primary-2">
              Go to the Staff app
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
