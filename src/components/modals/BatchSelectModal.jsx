import { useState, useRef, useEffect } from "react";
import { haptic } from "../../utils/helpers";

export default function BatchSelectModal({ receipts, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => new Set(receipts.map(r => r.id)));
  const overlayRef = useRef();
  const drawerRef = useRef();

  useEffect(() => {
    const handleKey = e => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const toggle = (id) => {
    haptic(10);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    haptic(10);
    if (selected.size === receipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(receipts.map(r => r.id)));
    }
  };

  const handleConfirm = () => {
    haptic(20);
    onConfirm(selected);
  };

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onCancel()}
      role="dialog" aria-modal="true" aria-labelledby="batch-title">
      <div className="rv-drawer" ref={drawerRef}>
        <div className="rv-handle" aria-hidden="true" />
        <div className="rv-head">
          <h2 id="batch-title" className="rv-title">Znaleziono {receipts.length} paragonów</h2>
          <button onClick={onCancel} aria-label="Zamknij" className="btn-close">✕</button>
        </div>

        <div className="rv-body">
          <p className="batch-desc">Wybierz, które paragony chcesz dodać:</p>

          <label className="batch-item batch-item--all">
            <input
              type="checkbox"
              checked={selected.size === receipts.length}
              onChange={toggleAll}
              className="batch-check"
            />
            <span className="batch-item-label">Zaznacz wszystkie</span>
          </label>

          {receipts.map((r, i) => (
            <label key={r.id} className={`batch-item${selected.has(r.id) ? " batch-item--selected" : ""}`}>
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="batch-check"
              />
              <div className="batch-item-info">
                <div className="batch-item-store">
                  <span className="batch-item-num">{i + 1}.</span>
                  {r.store || "Nieznany sklep"}
                </div>
                <div className="batch-item-meta">
                  {r.date || "Brak daty"}
                  {" · "}
                  {(r.items || []).length} produktów
                  {r.delivery_cost > 0 && " · 🚚 dostawa"}
                </div>
              </div>
              <div className="batch-item-total">
                {((r.items || []).reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0) + (parseFloat(r.delivery_cost) || 0)).toFixed(2)} zł
              </div>
            </label>
          ))}
        </div>

        <div className="rv-footer">
          <button className="btn-secondary" onClick={onCancel}>Anuluj</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={selected.size === 0}>
            Dalej ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
