import { useAppData } from "../../contexts/AppDataContext";
import { FX_SYMBOLS } from "../../config/defaults";
import { convertAmt } from "../../utils/helpers";

export default function DonutChart({ data, size = 200 }) {
  const { currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.24;
  const circ = 2 * Math.PI * R;
  let cumPct = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const offset = circ * (1 - cumPct - pct);
    const dash   = circ * pct - 2;
    cumPct += pct;
    return { ...d, offset, dash, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.12)" />
        </filter>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={R - r} />
      {/* Slices */}
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={s.color} strokeWidth={R - r}
          strokeDasharray={`${Math.max(0, s.dash)} ${circ}`}
          strokeDashoffset={s.offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: `stroke-dasharray .8s cubic-bezier(.16,1,.3,1) ${i * .06}s, stroke-dashoffset .8s cubic-bezier(.16,1,.3,1) ${i * .06}s` }}
          filter="url(#ds)"
        />
      ))}
      {/* Centre label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.09} fontWeight="700"
        fill="#1D1D1F" fontFamily="'JetBrains Mono', monospace">{convertAmt(total, currency)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={size * 0.054} fill="#AEAEB2"
        fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">łącznie {sym}</text>
    </svg>
  );
}
