import { MOBILE_VIEWS } from "../../config/constants";

export default function BottomNav({ view, go }) {
  return (
    <nav className="botnav" aria-label="Nawigacja mobilna">
      <div className="botnav-pill" role="list">
        {MOBILE_VIEWS.map((v, i) => (
          <div key={v.id} role="listitem" className="d-contents">
            {i === 3 && <div className="botnav-divider" aria-hidden="true" />}
            <button
              className={`botnav-btn${view === v.id ? " active" : ""}`}
              onClick={() => go(v.id)}
              aria-label={v.label}
              aria-current={view === v.id ? "page" : undefined}
            >
              <div className="bn-bg" aria-hidden="true" />
              <span className="bn-icon" aria-hidden="true">{v.icon}</span>
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
