import { useState, useRef, useMemo, useEffect } from "react";
import StorePickerInput from '../primitives/StorePickerInput';
import { ALL_CATS, CAT_ICONS } from '../../config/defaults';
import { haptic } from '../../utils/helpers';
import { getCorrectionStats } from '../../hooks/useCorrections';
import { useAppData } from '../../contexts/AppDataContext';

export default function ReceiptReviewModal({ receipt, onConfirm, onCancel }) {
  const { customStores, addCustomStore: onAddCustomStore } = useAppData();
  const [data, setData] = useState(() => ({
    store: receipt.store || "",
    address: receipt.address || "",
    zip_code: receipt.zip_code || "",
    city: receipt.city || "",
    date: receipt.date || new Date().toISOString().slice(0, 10),
    total: receipt.total ?? 0,
    total_discounts: receipt.total_discounts ?? 0,
    delivery_cost: receipt.delivery_cost ?? "",
    delivery_free: receipt.delivery_free || false,
    items: (receipt.items || []).map((it, i) => ({ ...it, _key: i })),
  }));
  const [expandedItem, setExpandedItem] = useState(null);
  const overlayRef = useRef();
  const drawerRef = useRef();
  const firstFieldRef = useRef();

  /* ── Focus trap & keyboard ── */
  useEffect(() => {
    firstFieldRef.current?.focus();
    const handleKey = e => {
      if (e.key === "Escape") { onCancel(); return; }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll(
        'input,select,textarea,button,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const updateField = (field, val) => setData(d => ({ ...d, [field]: val }));
  const updateItem = (idx, field, val) => setData(d => ({
    ...d,
    items: d.items.map((it, i) => i === idx ? { ...it, [field]: val } : it),
  }));
  const removeItem = idx => {
    haptic(12);
    setData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
    setExpandedItem(null);
  };
  const addItem = () => {
    haptic(12);
    const key = Date.now();
    setData(d => ({
      ...d,
      items: [...d.items, { _key: key, name: "", quantity: 1, unit: null, unit_price: 0, total_price: 0, discount: null, discount_label: null, category: "Inne" }],
    }));
    setExpandedItem(data.items.length);
  };

  const warnings = useMemo(() => {
    const w = [];
    const itemsSum = data.items.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0);
    const delivery = data.delivery_free ? 0 : (parseFloat(data.delivery_cost) || 0);
    const expectedTotal = itemsSum + delivery;
    const total = parseFloat(data.total) || 0;
    if (Math.abs(total - expectedTotal) > 0.01) {
      w.push(`Suma (${total.toFixed(2)}) nie zgadza się z sumą pozycji${delivery ? " + dostawa" : ""} (${expectedTotal.toFixed(2)})`);
    }
    data.items.forEach((it, idx) => {
      const up = parseFloat(it.unit_price);
      const qty = parseFloat(it.quantity);
      const tp = parseFloat(it.total_price) || 0;
      const disc = parseFloat(it.discount) || 0;
      if (up && qty) {
        const expected = up * qty - disc;
        if (Math.abs(tp - expected) > 0.01) {
          w.push(`Produkt ${idx + 1} "${it.name || "?"}": cena (${tp.toFixed(2)}) \u2260 cena jedn. \u00d7 ilo\u015b\u0107 \u2212 zni\u017cka (${expected.toFixed(2)})`);
        }
      }
    });
    return w;
  }, [data]);

  const handleConfirm = () => {
    haptic(20);
    const cleaned = {
      ...data,
      total: parseFloat(data.total) || 0,
      total_discounts: parseFloat(data.total_discounts) || 0,
      delivery_cost: parseFloat(data.delivery_cost) || null,
      delivery_free: data.delivery_free || false,
      items: data.items.map(({ _key, _suggestions, ...it }) => ({
        ...it,
        quantity: parseFloat(it.quantity) || 1,
        unit_price: parseFloat(it.unit_price) || null,
        total_price: parseFloat(it.total_price) || 0,
        discount: it.discount ? parseFloat(it.discount) : null,
      })),
    };
    onConfirm(cleaned);
  };

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onCancel()}
      role="dialog" aria-modal="true" aria-labelledby="rv-dialog-title">
      <div className="rv-drawer" ref={drawerRef}>
        <div className="rv-handle" aria-hidden="true" />
        <div className="rv-head">
          <h2 id="rv-dialog-title" className="rv-title">Sprawdź paragon</h2>
          <button onClick={onCancel} aria-label="Zamknij" className="btn-close">✕</button>
        </div>

        <div className="rv-body">
          {/* Header: date | shop | price | discounts */}
          <div className="rv-meta">
            <div>
              <label className="rv-lbl" htmlFor="rv-date">Data</label>
              <input id="rv-date" ref={firstFieldRef} className="field" type="date" value={data.date} onChange={e => updateField("date", e.target.value)} />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-store">Sklep</label>
              <StorePickerInput id="rv-store" value={data.store} onChange={v => updateField("store", v)} customStores={customStores} onAddCustomStore={onAddCustomStore} placeholder="Nazwa sklepu" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-address">Adres</label>
              <input id="rv-address" className="field" value={data.address} onChange={e => updateField("address", e.target.value)} placeholder="ul. Przykładowa 1" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-city">Miasto</label>
              <input id="rv-city" className="field" value={data.city} onChange={e => updateField("city", e.target.value)} placeholder="np. Katowice" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-zip">Kod pocztowy</label>
              <input id="rv-zip" className="field" value={data.zip_code} onChange={e => updateField("zip_code", e.target.value)} placeholder="00-000" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-total">Suma</label>
              <input id="rv-total" className="field field--text-right" type="number" step="0.01" value={data.total}
                onChange={e => updateField("total", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-discounts">Zniżki</label>
              <input id="rv-discounts" className="field field--text-right" type="number" step="0.01" value={data.total_discounts || 0}
                onChange={e => updateField("total_discounts", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="rv-lbl" htmlFor="rv-delivery">Dostawa</label>
              <input id="rv-delivery" className="field field--text-right" type="number" step="0.01" value={data.delivery_cost}
                onChange={e => updateField("delivery_cost", e.target.value)} placeholder="0.00" />
              <label className="rv-checkbox-row">
                <input type="checkbox" checked={data.delivery_free} onChange={e => updateField("delivery_free", e.target.checked)} />
                <span className="rv-checkbox-label">Darmowa</span>
              </label>
            </div>
          </div>

          {/* Items header */}
          <div className="rv-items-header">
            <div className="rv-lbl mb-0" aria-live="polite" aria-atomic="true">Produkty · {data.items.length}</div>
            <button onClick={addItem} aria-label="Dodaj produkt" className="btn-add-item">
              + Dodaj
            </button>
          </div>

          {/* Items */}
          {data.items.map((item, idx) => {
            const isExpanded = expandedItem === idx;
            const suggestions = item._suggestions;
            const itemId = `rv-item-${item._key}`;
            return (
              <div key={item._key} className="rv-item" role="group" aria-label={`Produkt ${idx + 1}: ${item.name || "bez nazwy"}`}>
                {/* Row 1: # badge, product name, delete */}
                <div className="rv-item-r1">
                  <div className="rv-item-num" aria-hidden="true">{idx + 1}</div>
                  <div className="rv-i-name">
                    <input id={`${itemId}-name`} className="field field--bold" value={item.name || ""} onChange={e => updateItem(idx, "name", e.target.value)}
                      placeholder="Nazwa produktu" aria-label={`Nazwa produktu ${idx + 1}`} />
                  </div>
                  <button className="rv-del-btn" onClick={() => removeItem(idx)} title="Usuń" aria-label={`Usuń produkt ${idx + 1}${item.name ? ": " + item.name : ""}`}>✕</button>
                </div>

                {/* Suggestions (when ambiguous) */}
                {suggestions && suggestions.length > 1 && (
                  <div className="rv-suggest" role="group" aria-label="Sugerowane nazwy">
                    <span className="rv-suggest-lbl" aria-hidden="true">Może:</span>
                    {suggestions.map(s => (
                      <button key={s} className="rv-suggest-pill"
                        aria-label={`Użyj nazwy: ${s}`}
                        onClick={() => { haptic(10); updateItem(idx, "name", s); updateItem(idx, "_suggestions", null); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Row 2: category | total price */}
                <div className="rv-item-r2">
                  <div className="rv-i-cat">
                    <label className="rv-lbl" htmlFor={`${itemId}-cat`}>Kategoria</label>
                    <select id={`${itemId}-cat`} className="field field--cursor" value={item.category || "Inne"} onChange={e => updateItem(idx, "category", e.target.value)}>
                      {ALL_CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c] || ""} {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="rv-lbl" htmlFor={`${itemId}-price`}>Cena</label>
                    <input id={`${itemId}-price`} className="field field--text-right field--bold700" type="number" step="0.01" value={item.total_price ?? 0}
                      onChange={e => updateItem(idx, "total_price", e.target.value)}
                      placeholder="0.00" />
                  </div>
                </div>

                {/* More toggle */}
                <button className="rv-more-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={`${itemId}-details`}
                  onClick={() => { haptic(10); setExpandedItem(isExpanded ? null : idx); }}>
                  {isExpanded ? "▲ Mniej" : "▼ Więcej"}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div id={`${itemId}-details`} role="group" aria-label="Szczegóły produktu">
                    {/* Row 3: jednostka | zniżka */}
                    <div className="rv-item-r3">
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-unit`}>Jednostka</label>
                        <input id={`${itemId}-unit`} className="field" value={item.unit || ""} onChange={e => updateItem(idx, "unit", e.target.value)}
                          placeholder="szt, kg…" />
                      </div>
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-discount`}>Zniżka</label>
                        <input id={`${itemId}-discount`} className="field field--text-right" type="number" step="0.01" value={item.discount ?? ""}
                          onChange={e => updateItem(idx, "discount", e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    {/* Row 4: cena jednostkowa | ilość */}
                    <div className="rv-item-r4">
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-uprice`}>Cena jedn.</label>
                        <input id={`${itemId}-uprice`} className="field field--text-right" type="number" step="0.01" value={item.unit_price ?? ""}
                          onChange={e => updateItem(idx, "unit_price", e.target.value)} placeholder="—" />
                      </div>
                      <div>
                        <label className="rv-lbl" htmlFor={`${itemId}-qty`}>Ilość</label>
                        <input id={`${itemId}-qty`} className="field field--text-right" type="number" step="0.001" value={item.quantity ?? 1}
                          onChange={e => updateItem(idx, "quantity", e.target.value)} />
                      </div>
                    </div>
                    {/* Row 5: etykieta zniżki (full width) */}
                    <div className="rv-item-r5">
                      <label className="rv-lbl" htmlFor={`${itemId}-dlabel`}>Etykieta zniżki</label>
                      <input id={`${itemId}-dlabel`} className="field" value={item.discount_label || ""}
                        onChange={e => updateItem(idx, "discount_label", e.target.value)} placeholder="np. -20%, PROMO, 2+1 gratis…" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {warnings.length > 0 && (
            <div className="warnings-box">
              <div className="warnings-title">{"\u26A0"} Uwaga — niezgodności:</div>
              {warnings.map((w, i) => <div key={i}>• {w}</div>)}
            </div>
          )}
        </div>

        <div className="rv-footer">
          <button className="btn-secondary" onClick={onCancel}>Odrzuć</button>
          <button className="btn-primary" onClick={handleConfirm}>Zatwierdź</button>
        </div>

        {/* Learning info */}
        <div className="rv-info" role="note">
          {(() => {
            const s = getCorrectionStats();
            return s.names + s.categories > 0
              ? <span>Nauczono: {s.names} nazw, {s.categories} kategorii — poprawki stosowane automatycznie.</span>
              : <span>Popraw błędy AI — aplikacja zapamięta Twoje korekty na przyszłość.</span>;
          })()}
          <span className="rv-info-note">
            Korekty działają lokalnie (słownik). Uczenie modelu AI w czasie rzeczywistym wymaga treningu na serwerze (server-side ML) — nie jest dostępne w trybie przeglądarkowym.
          </span>
        </div>
      </div>
    </div>
  );
}
