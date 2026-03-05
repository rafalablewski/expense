export default function Zl({ v, size = 14 }) {
  if (v == null || v === "") return <span className="zl-dash">—</span>;
  const n = parseFloat(v);
  return (
    <span className="mono" style={{ fontSize: size }}>
      {n.toFixed(2)}<span className="zl-unit" style={{ fontSize: size - 2 }}> zł</span>
    </span>
  );
}
