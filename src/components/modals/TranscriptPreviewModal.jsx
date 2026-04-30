import { useState, useRef, useEffect } from "react";
import { haptic } from "../../utils/helpers";

export default function TranscriptPreviewModal({ receipts, onConfirm, onCancel }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [importing, setImporting] = useState(false);
  const overlayRef = useRef();

  useEffect(() => {
    const handleKey = e => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const toggle = (id) => {
    haptic(8);
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPLN = receipts.reduce((s, r) => s + r.total, 0);
  const itemCount = receipts.reduce((s, r) => s + (r.items?.length || 0), 0);

  const handleConfirm = () => {
    haptic(30);
    setImporting(true);
    onConfirm(receipts);
  };

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onCancel()}
      role="dialog" aria-modal="true" aria-labelledby="transcript-preview-title">
      <div className="rv-drawer">
        <div className="rv-handle" aria-hidden="true" />
        <div className="rv-head">
          <h2 id="transcript-preview-title" className="rv-title">Podgląd: {receipts.length} paragonów</h2>
          <button onClick={onCancel} aria-label="Zamknij" className="btn-close">✕</button>
        </div>

        <div className="rv-body">
          <p className="batch-desc">
            Razem {totalPLN.toFixed(2)} zł · {itemCount} produktów. Rozwiń paragon, aby zobaczyć pozycje.
          </p>

          {receipts.map((r, i) => {
            const isOpen = expanded.has(r.id);
            return (
              <div key={r.id} className={`batch-item${isOpen ? " batch-item--selected" : ""}`} style={{ flexDirection: "column", alignItems: "stretch", cursor: "default" }}>
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-expanded={isOpen}
                  className="tp-row"
                >
                  <div className="batch-item-info">
                    <div className="batch-item-store">
                      <span className="batch-item-num">{i + 1}.</span>
                      {r.store || "Nieznany sklep"}
                      {r.city && <span className="tp-city"> · {r.city}</span>}
                    </div>
                    <div className="batch-item-meta">
                      {r.date}
                      {" · "}
                      {(r.items || []).length} {(r.items || []).length === 1 ? "pozycja" : "pozycji"}
                      {r.total_discounts > 0 && ` · rabaty -${r.total_discounts.toFixed(2)} zł`}
                    </div>
                  </div>
                  <div className="batch-item-total">{r.total.toFixed(2)} zł</div>
                  <span className="tp-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <ul className="tp-items">
                    {(r.items || []).map((it, idx) => (
                      <li key={idx} className="tp-item">
                        <span className="tp-item-name">{it.name}</span>
                        <span className="tp-item-cat">{it.category}</span>
                        <span className="tp-item-qty">
                          {it.quantity}{it.unit && it.unit !== "szt" ? ` ${it.unit}` : "×"} {it.unit_price?.toFixed(2)}
                        </span>
                        <span className="tp-item-price">{it.total_price.toFixed(2)} zł</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="rv-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={importing}>Anuluj</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={importing}>
            {importing ? "Dodawanie…" : `Dodaj ${receipts.length} do bazy`}
          </button>
        </div>
      </div>
    </div>
  );
}
