import { haptic } from "../../utils/helpers";

export default function Fab({ onClick }) {
  return (
    <button className="fab" onClick={() => { onClick(); haptic(12); }} aria-label="Dodaj wydatek">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2v18M2 11h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
    </button>
  );
}
