export default function SparkLine({ points, color, width = 120, height = 36 }) {
  if (!points || points.length < 2) return null;
  const minV = Math.min(...points), maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - minV) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: "all .5s" }} />
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]}
        r="3" fill={color} />
    </svg>
  );
}
