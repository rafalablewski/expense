import { useState, useRef, useEffect } from "react";
import StorePickerInput from '../primitives/StorePickerInput';
import { CATS, CAT_GROUPS, CAT_ICONS } from '../../config/defaults';
import { EXPENSE_TYPES } from '../../config/constants';
import { haptic } from '../../utils/helpers';
import $ from '../../config/theme';

const REC_CYCLES = ["Miesięcznie","Tygodniowo","Rocznie","Kwartalnie"];

export default function QuickAddExpense({ onAdd, onClose, onTextReceipt, apiKey, onNeedKey, customStores, onAddCustomStore }) {
  const [type,     setType]     = useState("one-time");
  const [name,     setName]     = useState("");
  const [amount,   setAmount]   = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit,     setUnit]     = useState("");
  const [unitPrice,setUnitPrice]= useState("");
  const [discount, setDiscount] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [category, setCategory] = useState("Inne");
  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10));
  const [store,    setStore]    = useState("");
  const [note,     setNote]     = useState("");
  const [cycle,    setCycle]    = useState("Miesięcznie");
  const [catGroup, setCatGroup] = useState("Jednorazowe");
  const [textMode, setTextMode] = useState(false);
  const [textVal,  setTextVal]  = useState("");
  const nameRef = useRef();
  const textRef = useRef();

  useEffect(() => {
    if (textMode) textRef.current?.focus();
    else nameRef.current?.focus();
  }, [textMode]);

  // Auto-calculate total from quantity × unit_price - discount
  useEffect(() => {
    const q = parseFloat(quantity) || 1;
    const up = parseFloat(unitPrice);
    if (up > 0) {
      const disc = parseFloat(discount) || 0;
      setAmount((q * up - disc).toFixed(2));
    }
  }, [quantity, unitPrice, discount]);

  // Close on overlay click
  const overlayRef = useRef();

  const submit = () => {
    if (!name.trim() || !parseFloat(amount)) return;
    haptic(20);
    onAdd({
      id:       Date.now() + Math.random(),
      name:     name.trim(),
      amount:   parseFloat(amount),
      quantity: parseFloat(quantity) || 1,
      unit:     unit.trim() || null,
      unit_price: parseFloat(unitPrice) || null,
      total_price: parseFloat(amount),
      discount: parseFloat(discount) || null,
      discount_label: discountLabel.trim() || null,
      category,
      date,
      store:    store.trim(),
      note:     note.trim(),
      type,
      cycle:    type === "recurring" ? cycle : null,
      source:   "manual",
    });
    onClose();
  };

  const allCatGroups = Object.entries(CAT_GROUPS);

  return (
    <div className="qa-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div className="qa-drawer">
        <div className="qa-handle" aria-hidden="true" />
        <div className="qa-head">
          <div className="qa-title">{textMode ? "Wpisz listę" : "Dodaj wydatek"}</div>
          <div className="flex-row gap-6">
            <button onClick={() => setTextMode(m => !m)}
              className={`toggle-btn${textMode ? " active" : ""}`}>
              {textMode ? "Formularz" : "Wpisz listę"}
            </button>
            <button onClick={onClose} aria-label="Zamknij"
              className="close-btn-sm">✕</button>
          </div>
        </div>
        <div className="qa-body">

          {textMode ? (
            <>
              <div className="text-receipt-hint">
                Wpisz produkty — każdy w nowej linii. AI odczyta nazwy, ilości i ceny.
              </div>
              <textarea ref={textRef} className="field text-receipt-area" value={textVal} onChange={e => setTextVal(e.target.value)}
                placeholder={"mleko 2zł\n2kg ziemniaków 6zł\n3 jogurty greckie activia\nchleb razowy 5.50\nmasło extra 200g 8.99zł"} />
              <button className="btn-primary" onClick={() => {
                  if (!textVal.trim()) return;
                  if (!apiKey) { onNeedKey(); return; }
                  haptic(20);
                  onTextReceipt(textVal.trim());
                }}
                disabled={!textVal.trim()}
                style={{ width: "100%", justifyContent: "center", minHeight: 52, fontSize: 16, marginTop: 14, opacity: textVal.trim() ? 1 : 0.4 }}
                aria-label="Analizuj z AI">
                Analizuj z AI
              </button>
            </>
          ) : (
            <>
              {/* Type */}
              <div className="field-label mb-10">Rodzaj</div>
              <div className="type-row">
                {EXPENSE_TYPES.map(t => (
                  <button key={t.id} className={`type-btn${type === t.id ? " on" : ""}`}
                    onClick={() => setType(t.id)} aria-pressed={type === t.id}>
                    <div className="tb-icon">{t.icon}</div>
                    <div>
                      <div className="fw-700 qa-type-label" style={{ color: type===t.id ? $.green : $.ink0 }}>{t.label}</div>
                      <div className="qa-type-sub">{t.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Name */}
              <div className="mb-14">
                <label htmlFor="qa-name" className="field-label">Nazwa</label>
                <input id="qa-name" ref={nameRef} className="field" value={name}
                  onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()}
                  placeholder="np. Młotek, Spotify, Pralka…" />
              </div>

              {/* Quantity + Unit + Unit Price row */}
              <div className="form-row">
                <div className="form-group min-w-70">
                  <label htmlFor="qa-qty" className="field-label">Ilość</label>
                  <input id="qa-qty" className="field text-right" type="number" min="0" step="0.01"
                    value={quantity} onChange={e => setQuantity(e.target.value)}
                    placeholder="1" />
                </div>
                <div className="form-group min-w-60">
                  <label htmlFor="qa-unit" className="field-label">Jedn.</label>
                  <input id="qa-unit" className="field" value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="szt, kg, l…" />
                </div>
                <div className="form-group min-w-90">
                  <label htmlFor="qa-uprice" className="field-label">Cena jedn.</label>
                  <input id="qa-uprice" className="field text-right" type="number" min="0" step="0.01"
                    value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>

              {/* Discount + Total row */}
              <div className="form-row">
                <div className="form-group min-w-80">
                  <label htmlFor="qa-disc" className="field-label">Zniżka (zł)</label>
                  <input id="qa-disc" className="field text-right" type="number" min="0" step="0.01"
                    value={discount} onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00" />
                </div>
                <div className="form-group min-w-80">
                  <label htmlFor="qa-disclbl" className="field-label">Opis zniżki</label>
                  <input id="qa-disclbl" className="field" value={discountLabel}
                    onChange={e => setDiscountLabel(e.target.value)}
                    placeholder="np. Karta Moja" />
                </div>
                <div className="form-group min-w-90">
                  <label htmlFor="qa-amt" className="field-label">Razem (PLN)</label>
                  <input id="qa-amt" className="field text-right" type="number" min="0" step="0.01"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && submit()} placeholder="0.00" />
                </div>
              </div>

              {/* Cycle (only for recurring) */}
              {type === "recurring" && (
                <div className="mb-14">
                  <div className="field-label mb-8">Cykl płatności</div>
                  <div className="pills-row" role="group" aria-label="Cykl">
                    {REC_CYCLES.map(c => (
                      <button key={c} className={`pill${cycle===c?" on":""}`} onClick={() => setCycle(c)} aria-pressed={cycle===c}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="mb-14">
                <div className="field-label mb-8">Kategoria</div>
                {/* Group tabs */}
                <div className="pills-row mb-10" role="group" aria-label="Grupa kategorii">
                  {allCatGroups.map(([grp]) => (
                    <button key={grp} className={`pill${catGroup===grp?" on":""}`} onClick={() => setCatGroup(grp)} aria-pressed={catGroup===grp}>{grp}</button>
                  ))}
                </div>
                {/* Cat grid */}
                <div className="cat-grid" role="group" aria-label="Wybierz kategorię">
                  {(CAT_GROUPS[catGroup] || []).map(cat => (
                    <button key={cat} className={`cat-tile${category===cat?" on":""}`}
                      onClick={() => setCategory(cat)} aria-pressed={category===cat} aria-label={cat}>
                      {CAT_ICONS[cat] || "📦"}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + store row */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="qa-date" className="field-label">Data</label>
                  <input id="qa-date" className="field" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="qa-store" className="field-label">Sklep / źródło</label>
                  <StorePickerInput id="qa-store" value={store} onChange={setStore} customStores={customStores} onAddCustomStore={onAddCustomStore} placeholder="np. Leroy Merlin, Amazon…" />
                </div>
              </div>

              {/* Note */}
              <div className="mb-20">
                <label htmlFor="qa-note" className="field-label">Notatka (opcjonalnie)</label>
                <input id="qa-note" className="field" value={note} onChange={e => setNote(e.target.value)} placeholder="Do czego służy, gdzie kupiłeś…" />
              </div>

              {/* Submit */}
              <button className="btn-primary" onClick={submit}
                disabled={!name.trim() || !parseFloat(amount)}
                style={{ width: "100%", justifyContent: "center", minHeight: 52, fontSize: 16, opacity: name.trim() && parseFloat(amount) ? 1 : 0.4 }}
                aria-label="Dodaj wydatek">
                {type==="recurring" ? "🔄 Dodaj cykliczny" : "✦ Dodaj wydatek"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
