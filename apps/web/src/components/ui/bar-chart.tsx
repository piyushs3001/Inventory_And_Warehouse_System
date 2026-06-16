export function BarChart({ values, labels, label }: { values: number[]; labels?: string[]; label?: string }) {
  const max = Math.max(...values, 1);
  const gap = 10;
  const bw = (100 - gap * (values.length - 1)) / values.length;
  return (
    <svg viewBox="0 0 100 100" className="h-[180px] w-full" preserveAspectRatio="none" role="img" aria-label={label ?? 'Bar chart'}>
      {values.map((v, i) => {
        // 90% of the 100-unit viewBox height — leaves 10 units headroom at the top
        const h = (v / max) * 90;
        return (
          <rect
            key={labels?.[i] ?? i}
            x={i * (bw + gap)}
            y={100 - h}
            width={bw}
            height={h}
            rx="1.5"
            fill="var(--primary)"
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
