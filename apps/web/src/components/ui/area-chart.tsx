export function AreaChart({ data, height = 180 }: { data: number[]; height?: number }) {
  const w = 600;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts: Array<[number, number]> = data.map((v, i) => [
    i * step,
    // `height - 20` shrinks the drawable range, and `- 10` shifts the baseline up,
    // together reserving ~10px padding at both the top and bottom of the viewBox.
    height - ((v - min) / span) * (height - 20) - 10,
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-fill)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
