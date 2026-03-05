export default function BarChart({ months, maxVal }) {
  const W = 36, GAP = 10, H = 100;
  const total = months.length;
  const width = total * (W + GAP) - GAP;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${H + 32}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {months.map((m, i) => {
        const barH = maxVal ? Math.max(4, (m.total / maxVal) * H) : 4;
        const x = i * (W + GAP);
        const isLast = i === months.length - 1;
        return (
          <g key={m.label}>
            <rect x={x} y={H - barH} width={W} height={barH} rx={6}
              fill={isLast ? "#06C167" : "rgba(6,193,103,0.20)"}
              style={{ transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * .05}s, y .7s cubic-bezier(.16,1,.3,1) ${i * .05}s` }}
            />
            {isLast && (
              <text x={x + W / 2} y={H - barH - 6} textAnchor="middle"
                fontSize={9} fontWeight="700" fill="#06C167"
                fontFamily="'JetBrains Mono', monospace">{m.total.toFixed(0)}</text>
            )}
            <text x={x + W / 2} y={H + 16} textAnchor="middle"
              fontSize={9} fill="#AEAEB2"
              fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
