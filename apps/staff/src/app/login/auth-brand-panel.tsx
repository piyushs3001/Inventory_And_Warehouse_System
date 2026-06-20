import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Decorative brand panel shared by the staff auth utility pages
 * (forgot/reset). Hidden under lg. The login page keeps its richer variant.
 */
export function AuthBrandPanel(): ReactNode {
  return (
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

      {/* Brandmark */}
      <div className="relative z-[2] flex items-center gap-2.5 text-base font-bold">
        <span className="grid size-9 place-items-center rounded-[10px] border border-white/30 bg-white/15 backdrop-blur">▦</span>
        IWS
      </div>

      {/* Hero copy */}
      <div className="relative z-[2] max-w-sm">
        <p className="font-mono text-[11.5px] tracking-[0.16em] uppercase opacity-80">Inventory &amp; Warehouse System</p>
        <h2 className="mt-3 mb-6 max-w-[14ch] text-[2.05rem] leading-[1.1] font-bold tracking-[-0.025em]">
          Back to your warehouse in a moment.
        </h2>
        <ul className="flex flex-col gap-2.5 text-sm opacity-95">
          {[
            'Reset links expire in an hour, single use',
            'Your existing sessions sign out on reset',
            'Trouble? Ask a Super Admin for help',
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

      <div className="relative z-[2] text-[12.5px] opacity-80">Secure password reset</div>
    </aside>
  );
}
