import { useEffect, useRef } from 'react';
import Zl from '../primitives/Zl';
import CatChip from '../primitives/CatChip';
import { useAppData } from '../../contexts/AppDataContext';
import { FX_SYMBOLS } from '../../config/defaults';
import { convertAmt, receiptSavings, sumReceiptItems, buildReceiptNumberMap } from '../../utils/helpers';

export default function ReceiptDetailPopup({ receiptId, navList, onClose, onNavigate }) {
  const { receipts, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const overlayRef = useRef(null);

  const receipt = receipts.find(r => r.id === receiptId);
  const currentIndex = navList.indexOf(receiptId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < navList.length - 1;
  const goPrev = () => hasPrev && onNavigate(navList[currentIndex - 1]);
  const goNext = () => hasNext && onNavigate(navList[currentIndex + 1]);

  const numberMap = buildReceiptNumberMap(receipts);
  const receiptNumber = numberMap.get(receiptId);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  if (!receipt) return null;

  const saved = receiptSavings(receipt);
  const total = sumReceiptItems(receipt);
  const numStr = receiptNumber ? `#${String(receiptNumber).padStart(3, '0')}` : "";

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      role="dialog" aria-modal="true" aria-label={`Paragon ${numStr}`}>
      <div className="rv-drawer">
        <div className="rv-handle" />

        {/* Header */}
        <div className="rdp-head">
          <div className="rdp-head-left">
            {numStr && <span className="receipt-num">{numStr}</span>}
            <span className="rdp-store">{receipt.store || "Paragon"}</span>
          </div>
          <button className="rdp-close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>

        {/* Meta */}
        <div className="rv-body">
          <div className="rdp-meta">
            <span>{receipt.date || "Brak daty"}</span>
            {(receipt.city || receipt.address || receipt.zip_code) && (
              <span> · {[receipt.address, receipt.zip_code, receipt.city].filter(Boolean).join(", ")}</span>
            )}
            <span> · {receipt.items?.length || 0} produktów</span>
          </div>

          {/* Items table */}
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
                {(receipt.items || []).map((item, i) => (
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

          {/* Delivery */}
          {parseFloat(receipt.delivery_cost) > 0 && (
            <div className="receipt-delivery">
              🚚 Dostawa: {receipt.delivery_free
                ? <><s className="delivery-strikethrough">{convertAmt(receipt.delivery_cost, currency)} {sym}</s> <span className="delivery-free-badge">darmowa</span></>
                : <>{convertAmt(receipt.delivery_cost, currency)} {sym}</>
              }
            </div>
          )}

          {/* Totals */}
          <div className="rdp-totals">
            <div className="rdp-total-row">
              <span>Razem</span>
              <span className="mono rdp-total-val">{convertAmt(total, currency)} {sym}</span>
            </div>
            {saved > 0 && (
              <div className="rdp-total-row rdp-total-row--discount">
                <span>Zaoszczędzono</span>
                <span className="mono">−{convertAmt(saved, currency)} {sym}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="rdp-nav">
          <button className="rdp-nav-btn" onClick={goPrev} disabled={!hasPrev} aria-label="Poprzedni paragon">
            ◀
          </button>
          <span className="rdp-counter">{currentIndex + 1} / {navList.length}</span>
          <button className="rdp-nav-btn" onClick={goNext} disabled={!hasNext} aria-label="Następny paragon">
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
