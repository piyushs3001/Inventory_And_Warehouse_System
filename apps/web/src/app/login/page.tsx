'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import type { ErrorResponseDto } from '@/lib/api/generated/model';
import type { ErrorType } from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      // Only a real 401 means the credentials are wrong. A network/CORS failure
      // (or a 5xx) has no response.status — don't mislabel it as bad credentials.
      const e = err as ErrorType<ErrorResponseDto>;
      const status = e.response?.status;
      const apiMessage =
        typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : undefined;
      setError(
        status === 401
          ? (apiMessage ?? 'Invalid credentials')
          : 'Unable to reach the server. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — decorative, hidden under lg */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
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
        <div className="relative flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-[10px] border border-white/30 bg-white/15 backdrop-blur">▦</span>
          IWS
        </div>
        <div className="relative max-w-sm">
          <p className="font-mono text-xs tracking-[0.16em] uppercase opacity-80">Inventory &amp; Warehouse System</p>
          <h2 className="mt-3 mb-6 text-3xl leading-tight font-bold">Run every warehouse from one calm dashboard.</h2>
          <ul className="flex flex-col gap-2.5 text-sm opacity-95">
            {['Live stock across all your locations', 'Every change traced to a person & time', 'AI reorder & forecasting, review-first'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-md bg-white/20">
                  <Check className="size-3" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {/* Decorative sample figures for the marketing panel — not live data. */}
        <div className="relative flex gap-8 text-xs opacity-80">
          <div><span className="block font-mono text-xl font-semibold">2</span>Warehouses</div>
          <div><span className="block font-mono text-xl font-semibold">1,284</span>SKUs tracked</div>
          <div><span className="block font-mono text-xl font-semibold">99.4%</span>Count accuracy</div>
        </div>
      </aside>

      {/* Auth card */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to your IWS workspace.</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                  className="pr-9" required />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none">
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
