import type { ReactNode } from 'react';

/**
 * Austere "command console" brand panel shared by the admin auth utility pages
 * (forgot/reset). Hidden under lg. The login page keeps its own variant.
 */
export function AuthBrandPanel(): ReactNode {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
      {/* Deep brand gradient — mixed toward BLACK (hue-safe; the design rule
          only forbids mixing toward WHITE). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(150deg, color-mix(in oklch, var(--primary) 80%, black), var(--primary) 46%, color-mix(in oklch, var(--primary) 36%, black))',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[120px] -right-[120px] z-0 size-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, oklch(1 0 0 / 0.20), transparent 60%)' }}
      />
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

      <div className="relative z-[2] max-w-sm">
        <p className="font-mono text-[11.5px] tracking-[0.16em] uppercase opacity-80">Inventory &amp; Warehouse System</p>
        <h2 className="mt-3 max-w-[13ch] text-[2.05rem] leading-[1.1] font-bold tracking-[-0.025em]">
          Reset access, securely.
        </h2>
      </div>

      <div className="relative z-[2] flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] tracking-[0.06em] uppercase opacity-75">
        <span>One-hour links</span>
        <span aria-hidden className="opacity-50">·</span>
        <span>Single use</span>
        <span aria-hidden className="opacity-50">·</span>
        <span>Sessions revoked</span>
      </div>
    </aside>
  );
}
