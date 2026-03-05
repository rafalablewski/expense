import { useState } from 'react';
import Zl from '../primitives/Zl';
import CatChip from '../primitives/CatChip';

export default function ReceiptCard({ r, onDelete, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const saved = parseFloat(r.total_discounts) || 0;
  const bid = `rc-${r.id}`;
  return (
    <article
      className="card"
      style={{ animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${delay}s both` }}
      aria-labelledby={`${bid}-name`}
    >
      <button
        className="receipt-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`${bid}-body`}
      >
        <div className="receipt-store-icon" aria-hidden="true">🧾</div>

        <div className="flex-1-min0">
          <div id={`${bid}-name`} className="receipt-name text-ellipsis">
            {r.store || "Paragon"}
          </div>
          <div className="receipt-meta">
            {r.date || "Brak daty"} · {r.items?.length || 0} produktów
            {(r.address || r.zip_code) && ` · ${[r.address, r.zip_code].filter(Boolean).join(", ")}`}
          </div>
        </div>

        <div className="text-right flex-shrink0">
          <div className="mono receipt-total">
            {parseFloat(r.total || 0).toFixed(2)}
            <span className="receipt-total-unit">zł</span>
          </div>
          {saved > 0 && (
            <div className="receipt-saved">
              −{saved.toFixed(2)} zł saved
            </div>
          )}
        </div>

        <div aria-hidden="true" className={`receipt-chevron${open ? " receipt-chevron--open" : ""}`}>▼</div>
      </button>

      {open && (
        <div id={`${bid}-body`} className="receipt-body-border">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {["Produkt", "Kat.", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                    <th key={h} scope="col" className={i >= 2 ? "text-right" : "text-left"}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="td-name fs-14">{item.name}</div>
                      {item.discount_label && (
                        <div className="discount-label">
                          🏷 {item.discount_label}
                        </div>
                      )}
                    </td>
                    <td><CatChip cat={item.category} /></td>
                    <td className="mono text-right color-ink2">
                      {item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="text-right"><Zl v={item.unit_price} /></td>
                    <td className="text-right">
                      {item.discount
                        ? <span className="mono discount-text">−{item.discount.toFixed(2)}</span>
                        : <span className="color-ink3">—</span>
                      }
                    </td>
                    <td className="text-right"><Zl v={item.total_price} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="receipt-footer">
            <button className="btn-danger" onClick={onDelete} aria-label={`Usuń paragon ${r.store || "Paragon"}`}>
              Usuń paragon
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
