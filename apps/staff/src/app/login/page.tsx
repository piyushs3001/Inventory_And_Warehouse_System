'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@iws/auth';
import { authControllerRegister, getAccessRole, Role } from '@iws/api-client';
import type { ErrorResponseDto } from '@iws/api-client';
import type { ErrorType } from '@iws/api-client';
import { Input } from '@iws/ui';
import { Label } from '@iws/ui';

type Tab = 'signin' | 'register';

// Roles allowed in the Staff app. A valid account with any other role (e.g. a
// Super Admin) is rejected here with a message + a link to the Admin Portal —
// we never silently send the user to the other app.
const STAFF_ROLES: string[] = [Role.STAFF, Role.WAREHOUSE_MANAGER];
const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:5001';

// Inputs match the wireframe scale (44px, strong border, brand focus ring) —
// the shared <Input> default is the compact 32px form-grid size.
const INPUT = 'h-11 rounded-md border-border-strong bg-surface px-3.5 text-sm';

/** Password input with a show/hide eye toggle and an optional strength meter. */
function PasswordField({
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
    ? [value.length >= 8, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(
        Boolean,
      ).length
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

export default function LoginPage() {
  const { login, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');

  // Sign in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stay, setStay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // When a valid account is for the *other* app, show a link to it.
  const [wrongApp, setWrongApp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Register → POST /auth/register (creates a PENDING_APPROVAL account; no tokens).
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [agree, setAgree] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Success banner shown on the sign-in panel after a successful registration.
  const [flash, setFlash] = useState<string | null>(null);
  // "Feature not wired yet" notice for SSO / forgot-password.
  const [notice, setNotice] = useState<string | null>(null);

  const onSignIn = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setFlash(null);
    setWrongApp(false);
    setSubmitting(true);
    try {
      await login(email, password);
      // Credentials are valid — but is this account allowed in the Staff app?
      const role = getAccessRole();
      if (role && !STAFF_ROLES.includes(role)) {
        await logout(); // don't keep a Staff session for an account that can't use it
        setError('This account doesn’t have access to the Staff app.');
        setWrongApp(true);
        return;
      }
      router.replace('/');
    } catch (err) {
      const ex = err as ErrorType<ErrorResponseDto>;
      const status = ex.response?.status;
      const apiMessage = typeof ex.response?.data?.message === 'string' ? ex.response.data.message : undefined;
      if (!ex.response) {
        // No HTTP response → network/CORS failure; don't mislabel as bad credentials.
        setError('Unable to reach the server. Please try again.');
      } else if (status === 401) {
        setError(apiMessage ?? 'Invalid credentials');
      } else {
        // e.g. 403 awaiting-approval / deactivated — surface the server's reason.
        setError(apiMessage ?? 'Sign in failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setRegisterError(null);
    if (rPassword !== rConfirm) {
      setRegisterError('Passwords do not match.');
      return;
    }
    if (!agree) {
      setRegisterError('Please accept the Terms of Service to continue.');
      return;
    }
    setRegistering(true);
    try {
      await authControllerRegister({ name: rName, email: rEmail, password: rPassword });
      setRName('');
      setREmail('');
      setRPassword('');
      setRConfirm('');
      setTab('signin');
      setError(null);
      setNotice(null);
      setFlash('Account created — it’s awaiting administrator approval. You can sign in once an admin activates it.');
    } catch (err) {
      const ex = err as ErrorType<ErrorResponseDto>;
      const status = ex.response?.status;
      const apiMessage = typeof ex.response?.data?.message === 'string' ? ex.response.data.message : undefined;
      setRegisterError(
        status === 409
          ? (apiMessage ?? 'Email already in use.')
          : status === 400
            ? 'Please check your details and try again.'
            : 'Unable to reach the server. Please try again.',
      );
    } finally {
      setRegistering(false);
    }
  };

  const switchTab = (t: Tab): void => {
    setTab(t);
    setError(null);
    setNotice(null);
    setFlash(null);
    setRegisterError(null);
    setWrongApp(false);
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ===== Brand art panel (decorative; hidden under lg) ===== */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        {/* Brand gradient. color-mix toward BLACK is hue-safe — the design rule
            only forbids mixing toward WHITE (which rotates blue → pink). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg, var(--primary-2), var(--primary) 55%, color-mix(in oklch, var(--primary) 60%, black))',
          }}
        />
        {/* Corner glows */}
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
        {/* Grid texture, masked to the top-right */}
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

        {/* Brandmark */}
        <div className="relative z-[2] flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-[10px] border border-white/30 bg-white/15 backdrop-blur">▦</span>
          IWS
        </div>

        {/* Hero copy */}
        <div className="relative z-[2] max-w-sm">
          <p className="font-mono text-[11.5px] tracking-[0.16em] uppercase opacity-80">Inventory &amp; Warehouse System</p>
          <h2 className="mt-3 mb-6 max-w-[12ch] text-[2.05rem] leading-[1.1] font-bold tracking-[-0.025em]">
            Run every warehouse from one calm dashboard.
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm opacity-95">
            {[
              'Live stock across all your locations',
              'Every change traced to a person & time',
              'AI reorder & forecasting, review-first',
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

        {/* Floating sample cards (decorative — not live data) */}
        <div aria-hidden className="pointer-events-none absolute top-[31%] right-6 z-[1] hidden w-[230px] xl:block">
          <div className="absolute top-[-20px] right-[10px] w-[165px] rounded-[14px] border border-white/20 bg-white/[0.13] p-[0.8rem_0.95rem] shadow-[0_18px_44px_-14px_oklch(0_0_0/0.45)] backdrop-blur-md animate-floaty">
            <div className="text-[11px] font-medium opacity-80">Stock value</div>
            <div className="mt-0.5 font-mono text-[1.4rem] font-semibold">$842k</div>
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
              <div className="text-[12.5px] font-semibold">Low stock alert</div>
              <div className="text-[11px] font-medium opacity-80">Steel Bolt M8 · 12 left</div>
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
              <div className="font-semibold">PO-1042 received</div>
              <div className="text-[11px] font-medium opacity-80">+180 available</div>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="relative z-[2] flex gap-9 text-[12.5px] opacity-80">
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">2</span>Warehouses
          </div>
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">1,284</span>SKUs tracked
          </div>
          <div>
            <span className="block font-mono text-[1.3rem] font-semibold">99.4%</span>Count accuracy
          </div>
        </div>
      </aside>

      {/* ===== Auth card ===== */}
      <div className="grid place-items-center overflow-y-auto p-8">
        <div className="w-full max-w-[382px]">
          {/* Sign in / Create account tabs */}
          <div role="tablist" aria-label="Authentication" className="mb-7 flex rounded-full border border-border bg-surface-2 p-1">
            {(['signin', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => switchTab(t)}
                className={`h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors ${
                  tab === t ? 'bg-surface text-primary-2 shadow-xs' : 'text-muted-foreground'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {tab === 'signin' ? (
            <form onSubmit={onSignIn} noValidate>
              <h1 className="text-[1.55rem] font-bold tracking-[-0.025em]">Welcome back</h1>
              <p className="mt-[0.35rem] mb-[1.6rem] text-[13.5px] text-muted-foreground">Sign in to your IWS workspace.</p>

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

              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />

              <div className="mt-[0.1rem] mb-[1.35rem] flex items-center justify-between text-[12.5px]">
                <label className="flex cursor-pointer items-center gap-[0.45rem] text-muted-foreground">
                  <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} className="accent-primary" />
                  Stay signed in
                </label>
                <button type="button" onClick={() => setNotice('Password reset isn’t available yet.')} className="font-medium text-primary-2">
                  Forgot password?
                </button>
              </div>

              {flash && (
                <p role="status" className="mb-3 rounded-md bg-ok-tint px-3 py-2 text-[12.5px] text-ok">
                  {flash}
                </p>
              )}
              {error && (
                <p role="alert" className="mb-1 text-sm text-destructive">
                  {error}
                </p>
              )}
              {wrongApp && (
                <p className="mb-3 text-[12.5px] text-muted-foreground">
                  Looks like an admin account.{' '}
                  <a href={ADMIN_APP_URL} className="font-semibold text-primary-2">
                    Open the Admin Portal →
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

              <p className="mt-[1.35rem] text-center text-[13px] text-muted-foreground">
                New to IWS?{' '}
                <button type="button" onClick={() => switchTab('register')} className="font-semibold text-primary-2">
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={onRegister} noValidate>
              <h1 className="text-[1.55rem] font-bold tracking-[-0.025em]">Create your account</h1>
              <p className="mt-[0.35rem] mb-[1.6rem] text-[13.5px] text-muted-foreground">
                Set up access — your admin assigns warehouse scope after.
              </p>

              <div className="mb-[1.05rem]">
                <Label htmlFor="r-name" className="mb-[0.42rem] block text-[12.5px] font-medium">
                  Full name
                </Label>
                <Input id="r-name" value={rName} onChange={(e) => setRName(e.target.value)} placeholder="e.g. Rosa Martins" className={INPUT} required />
              </div>

              <div className="mb-[1.05rem]">
                <Label htmlFor="r-email" className="mb-[0.42rem] block text-[12.5px] font-medium">
                  Work email
                </Label>
                <Input
                  id="r-email"
                  type="email"
                  value={rEmail}
                  onChange={(e) => setREmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className={INPUT}
                  required
                />
              </div>

              <PasswordField id="r-password" label="Password" value={rPassword} onChange={setRPassword} autoComplete="new-password" meter />
              <PasswordField id="r-confirm" label="Confirm password" value={rConfirm} onChange={setRConfirm} autoComplete="new-password" />

              <label className="mb-5 flex items-start gap-[0.55rem] text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-[0.15rem] accent-primary" />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>

              {registerError && (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  {registerError}
                </p>
              )}

              <button
                type="submit"
                disabled={registering}
                className="flex h-[46px] w-full items-center justify-center rounded-md bg-primary text-[14.5px] font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {registering ? 'Creating account…' : 'Create account'}
              </button>

              <p className="mt-[1.35rem] text-center text-[13px] text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => switchTab('signin')} className="font-semibold text-primary-2">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
