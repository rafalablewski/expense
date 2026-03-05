import { CATS } from '../../config/defaults';

export default function CatChip({ cat }) {
  const c = CATS[cat] || CATS["Inne"];
  return (
    <span className="chip" style={{ '--cat-color': c, background: c + "15", color: c, border: `1px solid ${c}25` }}>
      <span className="cat-chip-dot" style={{ background: c }} aria-hidden="true" />
      {cat}
    </span>
  );
}
