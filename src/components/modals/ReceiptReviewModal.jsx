import { useState, useRef, useMemo, useEffect } from "react";
import StorePickerInput from '../primitives/StorePickerInput';
import { CATS, ALL_CATS, CAT_ICONS } from '../../config/defaults';
import { FX_SYMBOLS } from '../../config/defaults';
import { haptic } from '../../utils/helpers';
import { useAppData } from '../../contexts/AppDataContext';

const MONTH_PL = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTH_PL[parseInt(m) - 1] || m} ${y}`;
};

const TOP_CATS = ["Nabiał","Mięso","Warzywa","Owoce","Napoje","Pieczywo","Zboża","Słodycze","Chemia","Kosmetyki","Inne"];
const UNITS = [
  { value: "szt", label: "szt" },
  { value: "kg",  label: "kg" },
  { value: "l",   label: "l" },
];

const CurrencyInput = ({ value, onChange, placeholder = "0.00", min = "0", step = "0.01", suffix, ...rest }) => (
  <div className="rv2-currency-wrap">
    <input className="field field--text-right field--currency" type="text" inputMode="decimal" min={min} step={step}
      value={value} onChange={onChange} placeholder={placeholder} {...rest} />
    <span className="rv2-currency-suffix">{suffix}</span>
  </div>
);

export default function ReceiptReviewModal({ receipt, onConfirm, onCancel, onSavePending }) {
  const { storeLocations, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";

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
    voucher: receipt.voucher ?? "",
    _locationLabel: receipt._locationLabel || "",
    items: (receipt.items || []).map((it, i) => ({
      ...it,
      _key: i,
      unit: it.unit || "szt",
    })),
  }));
  const [editingItem, setEditingItem] = useState(null);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [totalOverride, setTotalOverride] = useState(false);
  const [manualTotal, setManualTotal] = useState(receipt.total ?? 0);
  const overlayRef = useRef();
  const drawerRef = useRef();

  // Auto-open header when manual entry (no store name)
  useEffect(() => {
    if (!data.store && receipt.source === "manual") setHeaderOpen(true);
  }, []);

  /* Focus trap & keyboard */
  useEffect(() => {
    const handleKey = e => {
      if (e.key === "Escape") {
        if (editingItem !== null) { setEditingItem(null); return; }
        if (headerOpen) { setHeaderOpen(false); return; }
        onCancel();
        return;
      }
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
  }, [onCancel, editingItem, headerOpen]);

  const updateField = (field, val) => setData(d => ({ ...d, [field]: val }));
  const updateItem = (idx, field, val) => setData(d => ({
    ...d,
    items: d.items.map((it, i) => i === idx ? { ...it, [field]: val } : it),
  }));
  const removeItem = idx => {
    haptic(12);
    setData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
    setEditingItem(null);
  };
  const addItem = () => {
    haptic(12);
    const key = Date.now();
    setData(d => ({
      ...d,
      items: [...d.items, { _key: key, name: "", quantity: 1, unit: "szt", unit_price: 0, total_price: 0, discount: null, discount_label: null, category: "Inne" }],
    }));
    setEditingItem(data.items.length);
  };

  // Computed totals
  const computedTotal = useMemo(() => {
    const itemsSum = data.items.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0);
    const delivery = data.delivery_free ? 0 : (parseFloat(data.delivery_cost) || 0);
    const voucher = parseFloat(data.voucher) || 0;
    return itemsSum + delivery - voucher;
  }, [data.items, data.delivery_cost, data.delivery_free, data.voucher]);

  const computedDiscounts = useMemo(() =>
    data.items.reduce((s, it) => s + (parseFloat(it.discount) || 0), 0),
  [data.items]);

  const finalTotal = totalOverride ? (parseFloat(manualTotal) || 0) : computedTotal;

  const warnings = useMemo(() => {
    const w = [];
    if (totalOverride) {
      const manual = parseFloat(manualTotal) || 0;
      if (manual > 0 && Math.abs(manual - computedTotal) > 0.01) {
        w.push(`Ręczna suma (${manual.toFixed(2)}) różni się od sumy pozycji (${computedTotal.toFixed(2)})`);
      }
    }
    data.items.forEach((it) => {
      const up = parseFloat(it.unit_price);
      const qty = parseFloat(it.quantity);
      const tp = parseFloat(it.total_price) || 0;
      const disc = parseFloat(it.discount) || 0;
      if (up && qty) {
        const expected = up * qty - disc;
        if (Math.abs(tp - expected) > 0.01) {
          w.push(`"${it.name || "?"}": ${tp.toFixed(2)} \u2260 ${up.toFixed(2)} \u00d7 ${qty} \u2212 ${disc.toFixed(2)}`);
        }
      }
    });
    return w;
  }, [data, computedTotal, totalOverride, manualTotal]);

  const cleanData = () => ({
    ...data,
    total: finalTotal,
    total_discounts: computedDiscounts,
    delivery_cost: parseFloat(data.delivery_cost) || null,
    delivery_free: data.delivery_free || false,
    voucher: parseFloat(data.voucher) || null,
    items: data.items.map(({ _key, _suggestions, ...it }) => ({
      ...it,
      quantity: parseFloat(it.quantity) || 1,
      unit: it.unit || "szt",
      unit_price: parseFloat(it.unit_price) || null,
      total_price: parseFloat(it.total_price) || 0,
      discount: it.discount ? parseFloat(it.discount) : null,
      fuel_price_per_liter: it.category === "Paliwo" && it.fuel_price_per_liter ? parseFloat(it.fuel_price_per_liter) : null,
      fuel_amount_liters: it.category === "Paliwo" && it.fuel_amount_liters ? parseFloat(it.fuel_amount_liters) : null,
    })),
  });

  const handleConfirm = () => {
    haptic(20);
    onConfirm(cleanData());
  };

  const handleSavePending = () => {
    if (!onSavePending) return;
    haptic(20);
    onSavePending(cleanData());
  };

  // Format item display line
  const fmtItemLine = (item) => {
    const qty = parseFloat(item.quantity) || 1;
    const up = parseFloat(item.unit_price);
    const unit = item.unit || "szt";
    if (up && qty !== 1) {
      return `${qty} ${unit} \u00d7 ${up.toFixed(2)} ${sym}`;
    }
    if (qty !== 1) return `${qty} ${unit}`;
    return null;
  };

  // Header summary line
  const headerSummary = () => {
    const parts = [];
    if (data.date) parts.push(fmtDate(data.date));
    if (data.address) parts.push(data.address);
    else if (data.city) parts.push(data.city);
    return parts.join(" \u00b7 ");
  };

  return (
    <div className="rv-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onCancel()}
      role="dialog" aria-modal="true" aria-labelledby="rv-dialog-title">
      <div className="rv-drawer" ref={drawerRef}>
        <div className="rv-handle" aria-hidden="true" />

        {/* ── HEADER: collapsed summary or expanded form ── */}
        <div className="rv-body">
          {!headerOpen ? (
            <div className="rv2-header" onClick={() => { haptic(10); setHeaderOpen(true); }} role="button" tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && setHeaderOpen(true)}
              aria-label="Edytuj dane paragonu">
              <div className="rv2-header-top">
                <div className="rv2-store-name">{data.store || "Nieznany sklep"}</div>
                <button className="rv2-edit-link" onClick={e => { e.stopPropagation(); haptic(10); setHeaderOpen(true); }}
                  aria-label="Edytuj">Edytuj</button>
              </div>
              <div className="rv2-header-sub">{headerSummary() || "Kliknij aby uzupełnić dane"}</div>
            </div>
          ) : (
            <div className="rv2-header-form">
              <div className="rv2-form-row">
                <div className="rv2-form-group rv2-form-grow">
                  <label className="rv2-label">Sklep</label>
                  <StorePickerInput value={data.store} onChange={v => updateField("store", v)}
                    storeLocations={storeLocations}
                    onSelectLocation={(loc) => {
                      setData(d => ({ ...d, store: loc.store, address: loc.address, zip_code: loc.zip_code, city: loc.city }));
                    }}
                    placeholder="Wybierz sklep" />
                </div>
                <div className="rv2-form-group">
                  <label className="rv2-label">Data</label>
                  <input className="field" type="date" value={data.date} onChange={e => updateField("date", e.target.value)} />
                </div>
              </div>
              {/* Show selected location as read-only info */}
              {(data.address || data.city) && (
                <div className="rv2-loc-info">
                  <span className="rv2-loc-icon">📍</span>
                  <span className="rv2-loc-text">{[data.address, data.zip_code, data.city].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {/* New location: ask user to name this branch */}
              {receipt._isNewLocation && data.store && (
                <div className="rv2-new-loc-form">
                  <div className="rv2-new-loc-badge">Nowa lokalizacja</div>
                  <label className="rv2-label">Nazwa tej lokalizacji</label>
                  <input className="field" value={data._locationLabel}
                    onChange={e => updateField("_locationLabel", e.target.value)}
                    placeholder={`np. ${data.store} ${data.city || "Centrum"}`} />
                  <div className="rv2-new-loc-hint">Jak chcesz nazywać ten sklep? np. dzielnica, ulica</div>
                </div>
              )}
              {(parseFloat(data.delivery_cost) > 0 || data.delivery_free) && (
                <div className="rv2-form-row">
                  <div className="rv2-form-group">
                    <label className="rv2-label">Dostawa</label>
                    <CurrencyInput suffix={sym} value={data.delivery_cost}
                      onChange={e => updateField("delivery_cost", e.target.value)} />
                  </div>
                  <div className="rv2-form-group" style={{ alignSelf: "flex-end" }}>
                    <label className="rv-checkbox-row">
                      <input type="checkbox" checked={data.delivery_free} onChange={e => updateField("delivery_free", e.target.checked)} />
                      <span className="rv-checkbox-label">Darmowa</span>
                    </label>
                  </div>
                </div>
              )}
              <button className="rv2-done-btn" onClick={() => setHeaderOpen(false)}>Gotowe</button>
            </div>
          )}

          {/* ── ITEMS HEADER ── */}
          <div className="rv-items-header">
            <div className="rv2-section-title" aria-live="polite">Produkty ({data.items.length})</div>
            <button onClick={addItem} aria-label="Dodaj produkt" className="btn-add-item">+ Dodaj</button>
          </div>

          {/* ── ITEMS LIST ── */}
          {data.items.map((item, idx) => {
            const isEditing = editingItem === idx;
            const suggestions = item._suggestions;
            const catIcon = CAT_ICONS[item.category] || "";
            const catColor = CATS[item.category] || "#6B7280";
            const discount = parseFloat(item.discount) || 0;
            const qtyLine = fmtItemLine(item);
            const totalPrice = parseFloat(item.total_price) || 0;

            if (isEditing) {
              return (
                <div key={item._key} className="rv2-item rv2-item--editing" role="group"
                  aria-label={`Edytuj: ${item.name || "nowy produkt"}`}>

                  {/* ─ Name + delete ─ */}
                  <div className="rv2-edit-name-row">
                    <input className="field field--bold" value={item.name || ""} onChange={e => updateItem(idx, "name", e.target.value)}
                      placeholder="Nazwa produktu" autoFocus />
                    <button className="rv-del-btn" onClick={() => removeItem(idx)} title="Usuń" aria-label="Usuń produkt">✕</button>
                  </div>

                  {/* Suggestions */}
                  {suggestions && suggestions.length > 1 && (
                    <div className="rv-suggest" role="group" aria-label="Sugerowane nazwy">
                      <span className="rv-suggest-lbl">Może:</span>
                      {suggestions.map(s => (
                        <button key={s} className="rv-suggest-pill"
                          onClick={() => { haptic(10); updateItem(idx, "name", s); updateItem(idx, "_suggestions", null); }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ─ Section: Cena ─ */}
                  <div className="rv2-edit-section">
                    <div className="rv2-form-row">
                      <div className="rv2-form-group rv2-form-grow">
                        <label className="rv2-label">Cena całkowita</label>
                        <CurrencyInput suffix={sym} value={item.total_price ?? 0}
                          onChange={e => updateItem(idx, "total_price", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* ─ Section: Ilość & jednostka ─ */}
                  <div className="rv2-edit-section">
                    <div className="rv2-form-row">
                      <div className="rv2-form-group">
                        <label className="rv2-label">Ilość</label>
                        <input className="field field--text-right" type="text" inputMode="decimal" min="0" step="0.001" value={item.quantity ?? 1}
                          onChange={e => updateItem(idx, "quantity", e.target.value)} />
                      </div>
                      <div className="rv2-form-group">
                        <label className="rv2-label">Jednostka</label>
                        <div className="rv2-unit-pills">
                          {UNITS.map(u => (
                            <button key={u.value}
                              className={`rv2-unit-pill${(item.unit || "szt") === u.value ? " rv2-unit-pill--on" : ""}`}
                              onClick={() => { haptic(8); updateItem(idx, "unit", u.value); }}>
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rv2-form-group">
                        <label className="rv2-label">Cena jedn.</label>
                        <CurrencyInput suffix={sym} value={item.unit_price ?? ""}
                          onChange={e => updateItem(idx, "unit_price", e.target.value)} placeholder="auto" />
                      </div>
                    </div>
                  </div>

                  {/* ─ Section: Zniżka ─ */}
                  <div className="rv2-edit-section">
                    <div className="rv2-form-row">
                      <div className="rv2-form-group">
                        <label className="rv2-label">Zniżka</label>
                        <CurrencyInput suffix={sym} value={item.discount ?? ""}
                          onChange={e => updateItem(idx, "discount", e.target.value)} />
                      </div>
                      <div className="rv2-form-group rv2-form-grow">
                        <label className="rv2-label">Etykieta zniżki</label>
                        <input className="field" value={item.discount_label || ""}
                          onChange={e => updateItem(idx, "discount_label", e.target.value)} placeholder="np. -20%, PROMO" />
                      </div>
                    </div>
                  </div>

                  {/* ─ Section: Paliwo (fuel-specific fields) ─ */}
                  {item.category === "Paliwo" && (
                    <div className="rv2-edit-section">
                      <div className="rv2-form-row">
                        <div className="rv2-form-group">
                          <label className="rv2-label">Cena za litr</label>
                          <CurrencyInput suffix={sym} value={item.fuel_price_per_liter ?? ""}
                            onChange={e => updateItem(idx, "fuel_price_per_liter", e.target.value)}
                            placeholder="np. 6.50" />
                        </div>
                        <div className="rv2-form-group">
                          <label className="rv2-label">Ilość litrów</label>
                          <CurrencyInput suffix="L" value={item.fuel_amount_liters ?? ""}
                              onChange={e => updateItem(idx, "fuel_amount_liters", e.target.value)}
                              placeholder="np. 45.00" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─ Section: Kategoria ─ */}
                  <div className="rv2-edit-section">
                    <div className="rv2-label">Kategoria</div>
                    <div className="rv2-cat-pills">
                      {(showAllCats ? ALL_CATS : TOP_CATS).map(c => (
                        <button key={c}
                          className={`rv2-cat-pill${item.category === c ? " rv2-cat-pill--on" : ""}`}
                          style={item.category === c ? { borderColor: CATS[c], background: CATS[c] + "18", color: CATS[c] } : {}}
                          onClick={() => { haptic(8); updateItem(idx, "category", c); }}>
                          <span>{CAT_ICONS[c]}</span> {c}
                        </button>
                      ))}
                    </div>
                    {!showAllCats ? (
                      <button className="rv2-show-all-cats" onClick={() => setShowAllCats(true)}>
                        Więcej ({ALL_CATS.length - TOP_CATS.length})
                      </button>
                    ) : (
                      <button className="rv2-show-all-cats" onClick={() => setShowAllCats(false)}>
                        Mniej
                      </button>
                    )}
                  </div>

                  <button className="rv2-done-btn" onClick={() => { setEditingItem(null); setShowAllCats(false); }}>
                    Gotowe
                  </button>
                </div>
              );
            }

            // Collapsed item row
            return (
              <div key={item._key} className="rv2-item" role="button" tabIndex={0}
                onClick={() => { haptic(8); setEditingItem(idx); setShowAllCats(false); }}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && setEditingItem(idx)}
                aria-label={`${item.name || "Produkt"} — kliknij aby edytować`}>
                <div className="rv2-item-top">
                  <div className="rv2-item-name">{item.name || "Bez nazwy"}</div>
                  <div className="rv2-item-price">{totalPrice.toFixed(2)} {sym}</div>
                </div>
                <div className="rv2-item-bottom">
                  <span className="rv2-item-cat" style={{ color: catColor }}>
                    {catIcon} {item.category}
                  </span>
                  {qtyLine && <span className="rv2-item-qty">{qtyLine}</span>}
                  {item.category === "Paliwo" && item.fuel_price_per_liter && (
                    <span className="rv2-item-qty">{parseFloat(item.fuel_price_per_liter).toFixed(2)} {sym}/L</span>
                  )}
                  {item.category === "Paliwo" && item.fuel_amount_liters && (
                    <span className="rv2-item-qty">{parseFloat(item.fuel_amount_liters).toFixed(2)} L</span>
                  )}
                  {discount > 0 && (
                    <span className="rv2-item-discount">
                      -{discount.toFixed(2)} {sym}{item.discount_label ? ` ${item.discount_label}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── TOTALS ── */}
          <div className="rv2-totals">
            <div className="rv2-total-row">
              <span>Razem</span>
              {totalOverride ? (
                <CurrencyInput suffix={sym} value={manualTotal}
                  onChange={e => setManualTotal(e.target.value)}
                  style={{ maxWidth: 140 }} />
              ) : (
                <span className="rv2-total-val">{computedTotal.toFixed(2)} {sym}</span>
              )}
            </div>
            <button className="rv2-total-toggle" onClick={() => { haptic(8); setTotalOverride(o => !o); }}>
              {totalOverride ? "Użyj sumy z pozycji" : "Popraw ręcznie"}
            </button>
            {computedDiscounts > 0 && (
              <div className="rv2-total-row rv2-total-row--discount">
                <span>Zniżki</span>
                <span>-{computedDiscounts.toFixed(2)} {sym}</span>
              </div>
            )}
            <div className="rv2-total-row rv2-total-row--sub">
              <span>Bon / kupon</span>
              <CurrencyInput suffix={sym} value={data.voucher}
                onChange={e => updateField("voucher", e.target.value)}
                placeholder="0.00" style={{ maxWidth: 140 }} />
            </div>
            {!data.delivery_free && parseFloat(data.delivery_cost) > 0 && (
              <div className="rv2-total-row rv2-total-row--sub">
                <span>w tym dostawa</span>
                <span>{parseFloat(data.delivery_cost).toFixed(2)} {sym}</span>
              </div>
            )}
            {data.delivery_free && parseFloat(data.delivery_cost) > 0 && (
              <div className="rv2-total-row rv2-total-row--sub">
                <span>Dostawa (darmowa)</span>
                <span style={{ textDecoration: "line-through" }}>{parseFloat(data.delivery_cost).toFixed(2)} {sym}</span>
              </div>
            )}
          </div>

          {/* ── WARNINGS ── */}
          {warnings.length > 0 && (
            <div className="warnings-box">
              {warnings.map((w, i) => <div key={i} className="rv2-warning-line">⚠ {w}</div>)}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="rv2-footer">
          <button className="btn-primary rv2-confirm-btn" onClick={handleConfirm}>
            Zatwierdź paragon
          </button>
          {onSavePending && (
            <button className="rv2-pending-btn" onClick={handleSavePending}>
              Zapisz do sprawdzenia
            </button>
          )}
          <button className="rv2-cancel-link" onClick={onCancel}>
            Odrzuć
          </button>
        </div>
      </div>
    </div>
  );
}
