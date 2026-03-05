import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserData, saveAllUserData, updateField, subscribeUserData } from "./firestore";
import $ from "./config/theme";
import { CATS, ALL_CATS, CAT_GROUPS, CAT_ICONS, DEFAULT_STORES, FX, FX_SYMBOLS } from "./config/defaults";
import { VIEWS, MOBILE_VIEWS, EXPENSE_TYPES } from "./config/constants";
import { LS_KEYS, lsGet, lsSet } from "./services/localStorage";
import { scanReceipt as scanReceiptAPI, parseTextReceipt as parseTextReceiptAPI, getCorrectionsHint } from "./services/claude";
import { initCorrections, getCorrections, saveCorrections, learnFromCorrections, applyLearnedCorrections, getCorrectionStats } from "./hooks/useCorrections";
import { parseDate, convertAmt, haptic, isRecurringPaused } from "./utils/helpers";

function StorePickerInput({ value, onChange, customStores = [], onAddCustomStore, id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allStores = useMemo(() => [...new Set([...DEFAULT_STORES, ...(customStores || [])])], [customStores]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? allStores.filter(s => s.toLowerCase().includes(q)) : allStores;
  }, [search, allStores]);

  const select = (s) => { onChange(s); setSearch(s); setOpen(false); };

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Wybierz lub wpisz sklep"}
        autoComplete="off" />
      {open && (
        <div className="store-picker-dropdown">
          {filtered.map(s => (
            <div key={s} onClick={() => select(s)} className="store-picker-option">
              {DEFAULT_STORES.includes(s) ? "🏪" : "📝"} {s}
            </div>
          ))}
          {search && !allStores.some(s => s.toLowerCase() === search.toLowerCase()) && (
            <div onClick={() => { if (onAddCustomStore) onAddCustomStore(search); select(search); }}
              className="store-picker-add">
              + Dodaj "{search}" jako nowy sklep
            </div>
          )}
          {!search && filtered.length === 0 && (
            <div className="store-picker-empty">Brak sklepów</div>
          )}
        </div>
      )}
    </div>
  );
}



/* ─── Helpers ──────────────────────────────── */
function Zl({ v, size = 14 }) {
  if (v == null || v === "") return <span className="zl-dash">—</span>;
  const n = parseFloat(v);
  return (
    <span className="mono" style={{ fontSize: size }}>
      {n.toFixed(2)}<span className="zl-unit" style={{ fontSize: size - 2 }}> zł</span>
    </span>
  );
}
function CatChip({ cat }) {
  const c = CATS[cat] || CATS["Inne"];
  return (
    <span className="chip" style={{ '--cat-color': c, background: c + "15", color: c, border: `1px solid ${c}25` }}>
      <span className="cat-chip-dot" style={{ background: c }} aria-hidden="true" />
      {cat}
    </span>
  );
}
function Spinner() {
  return <div className="spinner" role="status" aria-label="Ładowanie" />;
}
function Empty({ icon, title, sub }) {
  return (
    <div className="empty" role="status">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}


/* ─── Drop Zone ──────────────────────────────── */
function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const pick = useCallback(files => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imgs.length) onFiles(imgs);
  }, [onFiles]);
  return (
    <div
      role="button" tabIndex={0}
      aria-label="Dodaj zdjęcia paragonów — kliknij lub przeciągnij i upuść"
      className={`dropzone${drag ? " drag" : ""}`}
      onClick={() => ref.current.click()}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
    >
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => pick(e.target.files)} />
      <div className="dropzone-content">
        <div className="dropzone-icon" aria-hidden="true">📸</div>
        <div className="dropzone-title">Skanuj paragon</div>
        <div className="dropzone-sub">
          Przeciągnij zdjęcie tutaj<br />
          <span className="dropzone-sub-hint">JPG · PNG · WEBP — Claude automatycznie odczyta dane</span>
        </div>
        <div className="dropzone-hint" aria-hidden="true">
          <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Wybierz pliki
        </div>
      </div>
    </div>
  );
}

/* ─── Receipt Review Drawer ──────────────────── */

function ReceiptReviewModal({ receipt, onConfirm, onCancel, customStores, onAddCustomStore }) {
  const [data, setData] = useState(() => ({
    store: receipt.store || "",
    address: receipt.address || "",
    zip_code: receipt.zip_code || "",
    date: receipt.date || new Date().toISOString().slice(0, 10),
    total: receipt.total ?? 0,
    total_discounts: receipt.total_discounts ?? 0,
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
    const total = parseFloat(data.total) || 0;
    if (Math.abs(total - itemsSum) > 0.01) {
      w.push(`Suma (${total.toFixed(2)}) nie zgadza się z sumą pozycji (${itemsSum.toFixed(2)})`);
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

/* ─── Receipt Card ───────────────────────────── */
function ReceiptCard({ r, onDelete, delay = 0 }) {
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

/* ─── Views ──────────────────────────────────── */

function ReceiptsView({ receipts, setReceipts, processing, errors, setErrors, onFiles }) {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Twoje <span>dokumenty</span></h1>
          <p className="page-subtitle au1">Skanuj paragony i faktury — Claude odczyta wszystko automatycznie</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-16">
          <div className="au1"><DropZone onFiles={onFiles} /></div>

          <div className="flex-col gap-8">
            {processing.map(p => (
              <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                <Spinner />
                <span>Analizuję <strong>{p.name}</strong>…</span>
              </div>
            ))}
            {errors.map((err, i) => (
              <div key={i} className="toast-err" role="alert">
                <span>{err}</span>
                <button onClick={() => setErrors(e => e.filter((_, j) => j !== i))} aria-label="Zamknij" className="btn-err-close">×</button>
              </div>
            ))}
          </div>

          {receipts.length > 0 && (
            <div>
              <div className="section-label">Zeskanowane · {receipts.length}</div>
              <div className="flex-col gap-10">
                {receipts.map((r, i) => (
                  <ReceiptCard
                    key={r.id} r={r} delay={i * 0.05}
                    onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {!receipts.length && !processing.length && (
            <p className="au2 empty-hint">
              Brak paragonów — dodaj pierwszy powyżej
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ProductsView({ receipts }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const all = receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })));
  const cats = [...new Set(all.map(i => i.category).filter(Boolean))];
  const list = all.filter(i =>
    (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
    (cat === "All" || i.category === cat)
  );
  const spent = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const saved = receipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner"><h1 className="page-title">Produkty</h1></div></div>
      <div className="container"><Empty icon="🛒" title="Brak produktów" sub="Dodaj paragony, aby zobaczyć bazę produktów" /></div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Baza <span>wydatków</span></h1>
          <p className="page-subtitle au1">{all.length} produktów ze {receipts.length} paragon{receipts.length === 1 ? "u" : "ów"}</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20">

          {/* Stats */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l: "Produktów", v: all.length, unit: "", color: $.ink0 },
              { l: "Wydano łącznie", v: spent.toFixed(2), unit: "zł", color: $.green },
              { l: "Zaoszczędzono", v: saved.toFixed(2), unit: "zł", color: $.red },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.color }}>
                  {s.v}<span className="stat-val-unit">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="au1 flex-col gap-12">
            <label htmlFor="psearch" className="sr-only">Szukaj produktu</label>
            <input
              id="psearch"
              className="field"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj produktu…"
            />
            <div className="flex-col gap-8">
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                <button className={`pill${cat === "All" ? " on" : ""}`} onClick={() => setCat("All")} aria-pressed={cat === "All"}>Wszystko</button>
                {Object.entries(CAT_GROUPS).map(([group, groupCats]) => {
                  const available = groupCats.filter(gc => cats.includes(gc));
                  if (!available.length) return null;
                  return (
                    <span key={group} className="d-contents">
                      <span className="pills-separator" aria-hidden="true" />
                      <span className="pills-group-label">{group}</span>
                      {available.map(gc => (
                        <button key={gc} className={`pill${cat === gc ? " on" : ""}`} onClick={() => setCat(gc)} aria-pressed={cat === gc}>{gc}</button>
                      ))}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card tbl-wrap au2">
            <table className="tbl" aria-label="Baza produktów">
              <thead>
                <tr>
                  {["Produkt", "Kategoria", "Sklep", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                    <th key={h} scope="col" className={i >= 4 ? "text-right" : "text-left"}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={8} className="td-no-results">Brak wyników dla &ldquo;{q}&rdquo;</td></tr>
                ) : list.map((item, i) => (
                  <tr key={i}>
                    <td className="td-name">{item.name}</td>
                    <td><CatChip cat={item.category} /></td>
                    <td className="color-ink2">{item.store || "—"}</td>
                    <td className="mono color-ink3 fs-12">{item.date || "—"}</td>
                    <td className="mono text-right color-ink2 fs-12">{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                    <td className="text-right"><Zl v={item.unit_price} /></td>
                    <td className="text-right">
                      {item.discount
                        ? <span className="mono td-discount-13">−{item.discount.toFixed(2)}</span>
                        : <span className="zl-dash">—</span>
                      }
                    </td>
                    <td className="text-right"><Zl v={item.total_price} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function ShoppingView({ receipts }) {
  const [items, setItems] = useState([]);
  const [val, setVal] = useState("");
  const [qty, setQty] = useState(1);
  const inputRef = useRef();
  const known = [...new Set(receipts.flatMap(r => (r.items || []).map(i => i.name)).filter(Boolean))].sort();

  const add = () => {
    if (!val.trim()) { inputRef.current?.focus(); return; }
    setItems(p => [...p, { name: val.trim(), qty, done: false, id: Date.now() }]);
    setVal(""); setQty(1); inputRef.current?.focus();
  };
  const toggle = id => { haptic(15); setItems(p => p.map(i => i.id === id ? { ...i, done: !i.done } : i)); };
  const remove = id => setItems(p => p.filter(i => i.id !== id));
  const done = items.filter(i => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Lista <span>zakupów</span></h1>
          <p className="page-subtitle au1">
            {items.length > 0 ? `${done} z ${items.length} zakupiono` : "Zaplanuj co kupić"}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-16" style={{ maxWidth: 680 }}>

          {/* Add form */}
          <div className="card au card--p22">
            <div className="flex-row flex-wrap gap-10 flex-end">
              <div className="form-group min-w-180">
                <label htmlFor="si" className="field-label-sm">Produkt</label>
                <input
                  id="si"
                  ref={inputRef}
                  className="field"
                  list="kp"
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && add()}
                  placeholder="np. Mleko, Chleb…"
                  autoComplete="off"
                />
                <datalist id="kp">{known.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="min-w-80" style={{ width: 80 }}>
                <label htmlFor="sq" className="field-label-sm">Ilość</label>
                <input
                  id="sq"
                  className="field text-center"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, +e.target.value))}
                />
              </div>
              <button className="btn-primary" onClick={add}>
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                Dodaj
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="au1 flex-row gap-12"
              role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length} aria-label={`${done} z ${items.length} zakupiono`}>
              <div className="prog"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
              <span className="mono text-muted nowrap">{done}/{items.length}</span>
            </div>
          )}

          {/* Items */}
          {items.length === 0 ? (
            <Empty icon="📋" title="Lista jest pusta" sub="Dodaj produkty powyżej. Podpowiedzi z paragonów pojawią się automatycznie." />
          ) : (
            <ul className="shop-list" aria-label="Lista zakupów">
              {items.map((item, i) => (
                <li key={item.id} style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .04}s both` }}>
                  <div className={`shop-item${item.done ? " done" : ""}`}>
                    <button
                      role="checkbox"
                      aria-checked={item.done}
                      aria-label={`${item.done ? "Odznacz" : "Zaznacz"} ${item.name}`}
                      className={`check-btn${item.done ? " on" : ""}`}
                      onClick={() => toggle(item.id)}
                    >
                      {item.done && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
                          <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    <span className={`shop-item-text${item.done ? " done" : ""}`}>
                      {item.name}
                    </span>

                    <span className="mono shop-item-qty">
                      ×{item.qty}
                    </span>

                    <button
                      className="btn-icon"
                      onClick={() => remove(item.id)}
                      aria-label={`Usuń ${item.name}`}
                    >×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function MealPlanView({ receipts, apiKey }) {
  const DAYS  = ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"];
  const MEALS = ["Śniadanie","Obiad","Kolacja"];
  const [plan,     setPlan]     = useState({}); // {`${day}-${meal}`: text}
  const [loading,  setLoading]  = useState(null); // cell key being generated
  const [pantry,   setPantry]   = useState("");
  const [genAll,   setGenAll]   = useState(false);
  const [shopList, setShopList] = useState([]);
  const [genShop,  setGenShop]  = useState(false);

  // Build ingredient list from recent receipts
  const knownItems = useMemo(() => {
    const cats = new Set(["Nabiał","Mięso","Warzywa","Owoce","Pieczywo","Zboża","Słodycze"]);
    return [...new Set(
      receipts.flatMap(r => (r.items||[])
        .filter(it => cats.has(it.category))
        .map(it => it.name)
        .filter(Boolean)
      )
    )].slice(0, 40);
  }, [receipts]);

  const callClaude = async (prompt) => {
    if (!apiKey) throw new Error("Brak klucza API");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    return d.content?.find(b => b.type === "text")?.text || "";
  };

  const generateCell = async (day, meal) => {
    const key = `${day}-${meal}`;
    setLoading(key);
    haptic(15);
    try {
      const context = knownItems.length
        ? `Produkty dostępne w lodówce: ${knownItems.slice(0,20).join(", ")}.`
        : "";
      const extra = pantry ? `Dodatkowe składniki: ${pantry}.` : "";
      const text = await callClaude(
        `Zaproponuj jedno konkretne danie na ${meal} na ${day}. ${context} ${extra}
Odpowiedz TYLKO nazwą dania i jednym zdaniem opisu (max 60 znaków). Format: "Nazwa — opis". Bez list, bez gwiazdek.`
      );
      setPlan(p => ({ ...p, [key]: text.trim() }));
      haptic(20);
    } catch(e) {
      setPlan(p => ({ ...p, [key]: "Błąd — spróbuj ponownie" }));
    } finally {
      setLoading(null);
    }
  };

  const generateAll = async () => {
    setGenAll(true);
    haptic(30);
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const key = `${day}-${meal}`;
        if (plan[key]) continue;
        setLoading(key);
        try {
          const context = knownItems.length ? `Produkty w lodówce: ${knownItems.slice(0,15).join(", ")}.` : "";
          const text = await callClaude(
            `Danie na ${meal}, ${day}. ${context} Odpowiedz TYLKO: "Nazwa — krótki opis" (max 55 znaków). Zero list.`
          );
          setPlan(p => ({ ...p, [key]: text.trim() }));
        } catch(e) { /* skip */ }
        setLoading(null);
        await new Promise(r => setTimeout(r, 200));
      }
    }
    setGenAll(false);
  };

  const generateShoppingList = async () => {
    if (!Object.keys(plan).length) return;
    setGenShop(true);
    haptic(20);
    try {
      const meals = Object.values(plan).join("\n");
      const text = await callClaude(
        `Na podstawie tych posiłków: ${meals}
        
Wygeneruj listę zakupów. Odpowiedz TYLKO jako JSON array stringów, np. ["Mleko","Jajka"]. Zero innych słów.`
      );
      const clean = text.replace(/```(?:json)?/g,"").trim();
      const arr = JSON.parse(clean);
      if (Array.isArray(arr)) setShopList(arr);
    } catch(e) { setShopList([]); }
    setGenShop(false);
  };

  const clearPlan = () => { setPlan({}); setShopList([]); };

  const filledCells = Object.keys(plan).length;
  const totalCells  = DAYS.length * MEALS.length;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">AI <span>Meal Planner</span></h1>
          <p className="page-subtitle au1">
            {filledCells > 0 ? `${filledCells}/${totalCells} posiłków zaplanowanych` : "Kliknij komórkę lub wygeneruj cały plan"}
          </p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-20">

          {/* Controls */}
          <div className="card au card--p20">
            <div className="flex-row flex-wrap gap-10 flex-end">
              <div className="form-group min-w-200">
                <label htmlFor="pantry" className="field-label">
                  Dodatkowe składniki (opcjonalnie)
                </label>
                <input id="pantry" className="field" value={pantry} onChange={e=>setPantry(e.target.value)}
                  placeholder="np. ryż, pomidory, ser żółty…" />
              </div>
              <button className="btn-primary" onClick={generateAll} disabled={genAll}
                style={{ gap:8, minHeight:48, opacity: genAll ? 0.7 : 1 }}>
                {genAll ? <><Spinner />Generuję…</> : "✦ Generuj cały plan"}
              </button>
              {filledCells > 0 && (
                <>
                  <button className="btn-secondary" onClick={generateShoppingList} disabled={genShop}
                    style={{ minHeight:48 }}>
                    {genShop ? <><Spinner />Listuję…</> : "🛒 Lista zakupów"}
                  </button>
                  <button onClick={clearPlan}
                    className="btn-ghost">
                    Wyczyść
                  </button>
                </>
              )}
            </div>
            {knownItems.length > 0 && (
              <div className="known-items-hint">
                <span className="known-items-label">Z Twoich paragonów: </span>
                {knownItems.slice(0,12).join(" · ")}
                {knownItems.length > 12 && ` +${knownItems.length-12} więcej`}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="mgrid-outer au1">
            <div className="meal-scroll">
              <table className="meal-table">
                <thead>
                  <tr>
                    <th className="meal-th--row"></th>
                    {DAYS.map(d => (
                      <th key={d} className="meal-th">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEALS.map((meal, mi) => (
                    <tr key={meal}>
                      <td className="meal-td-label">{meal}</td>
                      {DAYS.map(day => {
                        const key   = `${day}-${meal}`;
                        const text  = plan[key];
                        const busy  = loading === key;
                        const [name, desc] = text ? text.split("—").map(s=>s.trim()) : ["",""];
                        return (
                          <td key={key} className="meal-td">
                            <button
                              onClick={() => !busy && generateCell(day, meal)}
                              aria-label={`${meal} ${day}${text ? ": "+text : " — kliknij aby wygenerować"}`}
                              className={`meal-cell-btn${busy ? " busy" : ""}`}
                            >
                              {busy ? (
                                <div className="meal-spinner-wrap">
                                  <Spinner />
                                </div>
                              ) : text ? (
                                <>
                                  <span className="meal-cell-name">{name}</span>
                                  {desc && <span className="meal-cell-desc">{desc}</span>}
                                </>
                              ) : (
                                <span className="meal-cell-plus">+</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated shopping list */}
          {shopList.length > 0 && (
            <div className="card au2 card--p22">
              <div className="section-heading mb-14">
                Lista zakupów z planu — {shopList.length} pozycji
              </div>
              <div className="flex-row flex-wrap gap-8">
                {shopList.map((item, i) => (
                  <span key={i} className="meal-shop-pill">{item}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}


/* ─── Stats helpers ──────────────────────────── */
function DonutChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.24;
  const circ = 2 * Math.PI * R;
  let cumPct = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const offset = circ * (1 - cumPct - pct);
    const dash   = circ * pct - 2;
    cumPct += pct;
    return { ...d, offset, dash, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.12)" />
        </filter>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={R - r} />
      {/* Slices */}
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={s.color} strokeWidth={R - r}
          strokeDasharray={`${Math.max(0, s.dash)} ${circ}`}
          strokeDashoffset={s.offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: `stroke-dasharray .8s cubic-bezier(.16,1,.3,1) ${i * .06}s, stroke-dashoffset .8s cubic-bezier(.16,1,.3,1) ${i * .06}s` }}
          filter="url(#ds)"
        />
      ))}
      {/* Centre label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={size * 0.09} fontWeight="700"
        fill="#1D1D1F" fontFamily="'JetBrains Mono', monospace">{(total).toFixed(0)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={size * 0.054} fill="#AEAEB2"
        fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">łącznie zł</text>
    </svg>
  );
}

function BarChart({ months, maxVal }) {
  const W = 36, GAP = 10, H = 100;
  const total = months.length;
  const width = total * (W + GAP) - GAP;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${H + 32}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {months.map((m, i) => {
        const barH = maxVal ? Math.max(4, (m.total / maxVal) * H) : 4;
        const x = i * (W + GAP);
        const isLast = i === months.length - 1;
        return (
          <g key={m.label}>
            <rect x={x} y={H - barH} width={W} height={barH} rx={6}
              fill={isLast ? "#06C167" : "rgba(6,193,103,0.20)"}
              style={{ transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * .05}s, y .7s cubic-bezier(.16,1,.3,1) ${i * .05}s` }}
            />
            {isLast && (
              <text x={x + W / 2} y={H - barH - 6} textAnchor="middle"
                fontSize={9} fontWeight="700" fill="#06C167"
                fontFamily="'JetBrains Mono', monospace">{m.total.toFixed(0)}</text>
            )}
            <text x={x + W / 2} y={H + 16} textAnchor="middle"
              fontSize={9} fill="#AEAEB2"
              fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function InsightCard({ icon, title, sub, accent }) {
  return (
    <div className={`insight-card${accent ? " accent" : ""}`}>
      <div className="insight-icon">{icon}</div>
      <div>
        <div className="insight-title">{title}</div>
        <div className="insight-sub">{sub}</div>
      </div>
    </div>
  );
}

function StatsView({ receipts, expenses = [], allItems: allItemsProp = [], currency = "PLN" }) {
  // ── Filter state ──
  const [activeGroups, setActiveGroups] = useState({ "Spożywcze": true, "Rachunki": true, "Jednorazowe": true });
  const [selectedStore, setSelectedStore] = useState("");

  // Build set of allowed categories from active groups
  const allowedCats = useMemo(() => {
    const set = new Set();
    Object.entries(CAT_GROUPS).forEach(([group, cats]) => {
      if (activeGroups[group]) cats.forEach(c => set.add(c));
    });
    return set;
  }, [activeGroups]);

  const toggleGroup = (group) => setActiveGroups(prev => ({ ...prev, [group]: !prev[group] }));

  // ── Merge all items: receipt items + manual expenses (treat manual as receipt) ──
  const allRaw = allItemsProp.length > 0 ? allItemsProp :
    receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })));

  // ── Unique stores for the shop filter ──
  const storeList = useMemo(() => {
    const set = new Set();
    allRaw.forEach(it => { if (it.store) set.add(it.store.trim()); });
    return [...set].sort((a, b) => a.localeCompare(b, "pl"));
  }, [allRaw]);

  // ── Apply filters ──
  const all = useMemo(() => allRaw.filter(item => {
    const cat = item.category || "Inne";
    if (!allowedCats.has(cat)) return false;
    if (selectedStore && (!item.store || item.store.trim() !== selectedStore)) return false;
    return true;
  }), [allRaw, allowedCats, selectedStore]);

  // Build a set of receipt IDs that have at least one item passing filters, for filtering receipt-level totals
  const filteredReceiptIds = useMemo(() => {
    const ids = new Set();
    // For receipt-level stats (monthly chart, savings), filter receipts by store only
    receipts.forEach(r => {
      if (selectedStore && (!r.store || r.store.trim() !== selectedStore)) return;
      ids.add(r.id);
    });
    return ids;
  }, [receipts, selectedStore]);

  const filteredReceipts = useMemo(() =>
    receipts.filter(r => filteredReceiptIds.has(r.id)),
    [receipts, filteredReceiptIds]
  );
  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      const cat = e.category || "Inne";
      if (!allowedCats.has(cat)) return false;
      if (selectedStore && (!e.store || e.store.trim() !== selectedStore)) return false;
      return true;
    }),
    [expenses, allowedCats, selectedStore]
  );

  // ── Category breakdown ──
  const catTotals = useMemo(() => {
    const map = {};
    all.forEach(item => {
      const cat = item.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(item.total_price) || 0);
    });
    return Object.entries(map)
      .map(([cat, value]) => ({ cat, value, color: CATS[cat] || "#9CA3AF" }))
      .sort((a, b) => b.value - a.value);
  }, [all]);

  // ── Monthly aggregation ──
  const monthData = useMemo(() => {
    const map = {};
    const addToMap = (date, amount) => {
      if (!date) return;
      let key = null;
      const m1 = date.match(/^(\d{4})-(\d{2})/);
      const m2 = date.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
      if (m1) key = `${m1[1]}-${m1[2]}`;
      else if (m2) key = `${m2[3]}-${m2[2]}`;
      if (!key) return;
      map[key] = (map[key] || 0) + (parseFloat(amount) || 0);
    };
    filteredReceipts.forEach(r => addToMap(r.date, r.total));
    filteredExpenses.forEach(e => addToMap(e.date, e.amount));
    const months = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, total]) => {
        const [, mStr] = key.split("-");
        return { label: months[parseInt(mStr, 10) - 1] || mStr, total };
      });
  }, [filteredReceipts, filteredExpenses]);

  // ── Summary numbers ──
  const totalSpent  = filteredReceipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0)
    + filteredExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalSaved  = filteredReceipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);
  const totalCount  = filteredReceipts.length + filteredExpenses.length;
  const avgReceipt  = totalCount ? totalSpent / totalCount : 0;
  const maxMonth    = Math.max(...monthData.map(m => m.total), 1);

  // ── Insights ──
  const topCat    = catTotals[0];
  const topCatPct = topCat && totalSpent ? ((topCat.value / totalSpent) * 100).toFixed(0) : 0;
  const savePct   = totalSpent ? ((totalSaved / (totalSpent + totalSaved)) * 100).toFixed(1) : 0;

  // Top 3 most expensive individual items
  const top3Items = useMemo(() =>
    [...all].sort((a, b) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0)).slice(0, 3),
    [all]
  );

  // Most visited store
  const topStore = useMemo(() => {
    const map = {};
    filteredReceipts.forEach(r => { if (r.store) { const k = r.store.trim().toLowerCase(); if (!map[k]) map[k] = { name: r.store.trim(), count: 0 }; map[k].count++; } });
    const entries = Object.values(map).sort((a, b) => b.count - a.count);
    return entries[0] || null;
  }, [filteredReceipts]);

  // Day of week with highest spending
  const topDayOfWeek = useMemo(() => {
    const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
    const map = new Array(7).fill(0);
    filteredReceipts.forEach(r => {
      const d = parseDate(r.date);
      if (d) map[d.getDay()] += (parseFloat(r.total) || 0);
    });
    const maxVal = Math.max(...map);
    const maxIdx = map.indexOf(maxVal);
    return maxVal > 0 ? { day: days[maxIdx], amount: map[maxIdx] } : null;
  }, [filteredReceipts]);

  // Average items per receipt
  const avgItemsPerReceipt = useMemo(() => {
    if (!filteredReceipts.length) return 0;
    const total = filteredReceipts.reduce((s, r) => s + (r.items?.length || 0), 0);
    return (total / filteredReceipts.length).toFixed(1);
  }, [filteredReceipts]);

  // ── Check if any filter is active ──
  const anyGroupOff = !activeGroups["Spożywcze"] || !activeGroups["Rachunki"] || !activeGroups["Jednorazowe"];
  const hasActiveFilter = anyGroupOff || selectedStore !== "";

  if (!receipts.length && !expenses.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Statystyki</h1>
        <p className="page-subtitle au1">Dodaj paragony, aby zobaczyć analizę wydatków</p>
      </div></div>
      <div className="container"><div style={{ height: 200 }}><div className="empty" style={{ paddingTop: 60 }}>
        <div className="empty-icon">📊</div>
        <div className="empty-title">Brak danych</div>
        <div className="empty-sub">Dodaj paragony, aby zobaczyć wykresy i statystyki</div>
      </div></div></div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Statystyki <span>wydatków</span></h1>
          <p className="page-subtitle au1">{totalCount} paragon{totalCount === 1 ? "" : "ów"} · {all.length} pozycji</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-24">

          {/* ── Filter bar ── */}
          <div className="card au filter-bar">
            <div className="section-heading" style={{ marginRight: 4, marginBottom: 0 }}>
              Filtry
            </div>
            {Object.keys(CAT_GROUPS).map(group => (
              <button
                key={group}
                onClick={() => toggleGroup(group)}
                className={`stats-filter-btn${activeGroups[group] ? " active" : ""}`}
              >
                {group}
              </button>
            ))}
            <div className="h-divider" />
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className={`stats-filter-select${selectedStore ? " active" : ""}`}
            >
              <option value="">Wszystkie sklepy</option>
              {storeList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasActiveFilter && (
              <button
                onClick={() => { setActiveGroups({ "Spożywcze": true, "Rachunki": true, "Jednorazowe": true }); setSelectedStore(""); }}
                className="stats-clear-btn"
              >
                Wyczyść filtry
              </button>
            )}
          </div>

          {/* ── Top stats row ── */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l: "Łącznie wydano",    v: totalSpent.toFixed(2),  u: "zł", col: $.ink0 },
              { l: "Śr. paragon",       v: avgReceipt.toFixed(2),  u: "zł", col: $.ink0 },
              { l: "Zaoszczędzono",     v: totalSaved.toFixed(2),  u: "zł", col: $.red  },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.col }}>
                  {s.v}<span className="stat-val-unit">{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Donut + legend row ── */}
          <div className="card au1 card--p24">
            <div className="section-heading mb-20">
              Podział wg kategorii
            </div>
            <div className="flex-row flex-wrap" style={{ gap: 32 }}>
              {/* Donut */}
              <div className="flex-shrink-0">
                <DonutChart data={catTotals.map(d => ({ value: d.value, color: d.color }))} size={180} />
              </div>
              {/* Legend */}
              <div className="legend-list">
                {catTotals.slice(0, 7).map(d => {
                  const pct = totalSpent ? (d.value / totalSpent * 100).toFixed(1) : 0;
                  return (
                    <div key={d.cat} className="legend-row">
                      <div className="legend-dot" style={{ background: d.color }} />
                      <div className="legend-name">{d.cat}</div>
                      <div className="legend-bar-wrap">
                        <div className="legend-bar">
                          <div className="legend-bar-fill" style={{ width: `${pct}%`, background: d.color }} />
                        </div>
                        <span className="mono legend-pct">{pct}%</span>
                        <span className="mono legend-amt">{d.value.toFixed(0)} zł</span>
                      </div>
                    </div>
                  );
                })}
                {catTotals.length > 7 && (
                  <div className="legend-more">+ {catTotals.length - 7} innych kategorii</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Monthly bar chart ── */}
          {monthData.length > 0 && (
            <div className="card au2 card--p24">
              <div className="section-heading mb-20">
                Wydatki miesięczne
              </div>
              <BarChart months={monthData} maxVal={maxMonth} />
            </div>
          )}

          {/* ── Insight cards ── */}
          <div className="au3 flex-col gap-10">
            <div className="section-heading-sm">
              Spostrzeżenia
            </div>

            {top3Items.length > 0 && (
              <InsightCard
                icon="🏆"
                title="Top 3 najdroższe zakupy"
                sub={top3Items.map((it, i) =>
                  `${i + 1}. ${it.name} — ${(parseFloat(it.total_price) || 0).toFixed(2)} zł${it.store ? ` (${it.store})` : ""}`
                ).join("\n")}
                accent={false}
              />
            )}

            {topCat && (
              <InsightCard
                icon="📌"
                title={`${topCat.cat} to Twój największy wydatek`}
                sub={`${topCat.value.toFixed(2)} zł · ${topCatPct}% wszystkich wydatków`}
                accent={false}
              />
            )}

            {totalSaved > 0 && (
              <InsightCard
                icon="✦"
                title={`Zaoszczędziłeś ${savePct}% dzięki rabatom`}
                sub={`${totalSaved.toFixed(2)} zł zaoszczędzono na ${filteredReceipts.length} paragonach`}
                accent={true}
              />
            )}

            {avgReceipt > 0 && (
              <InsightCard
                icon="🧾"
                title={`Średni paragon: ${avgReceipt.toFixed(2)} zł`}
                sub={`Łącznie ${totalCount} wizyt zakupowych · ${all.length} unikalnych pozycji`}
                accent={false}
              />
            )}

            {catTotals.length >= 3 && (
              <InsightCard
                icon="📊"
                title={`${catTotals.length} aktywnych kategorii wydatków`}
                sub={`Top 3: ${catTotals.slice(0,3).map(d => d.cat).join(", ")}`}
                accent={false}
              />
            )}

            {topStore && (
              <InsightCard
                icon="🏪"
                title={`Najczęściej odwiedzany sklep: ${topStore.name}`}
                sub={`${topStore.count} wizyt zakupowych`}
                accent={false}
              />
            )}

            {topDayOfWeek && (
              <InsightCard
                icon="📅"
                title={`Najwięcej wydajesz w: ${topDayOfWeek.day}`}
                sub={`${topDayOfWeek.amount.toFixed(2)} zł łącznie w ten dzień tygodnia`}
                accent={false}
              />
            )}

            {avgItemsPerReceipt > 0 && (
              <InsightCard
                icon="🛒"
                title={`Średnio ${avgItemsPerReceipt} produktów na paragon`}
                sub={`Na podstawie ${filteredReceipts.length} paragonów`}
                accent={false}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
}


/* ─── StoresView ─────────────────────────────── */
const TIME_RANGES = [
  { id: "7",   label: "7 dni"   },
  { id: "30",  label: "30 dni"  },
  { id: "90",  label: "3 mies." },
  { id: "all", label: "Wszystko" },
];


function StoresView({ receipts }) {
  const [range,      setRange]      = useState("all");
  const [storeQ,     setStoreQ]     = useState("");
  const [activeStore,setActiveStore] = useState(null); // drilldown
  const [drillQ,     setDrillQ]     = useState("");
  const [drillCat,   setDrillCat]   = useState("All");

  // ── Filter receipts by time range ──
  const now = new Date();
  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(now - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  // ── Build store summary map (grouped by normalized store name, with locations) ──
  const storeMap = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const raw = (r.store || "Nieznany sklep").trim();
      const key = raw.toLowerCase();
      if (!map[key]) map[key] = { name: raw, visits: 0, total: 0, saved: 0, items: [], lastDate: null, locations: {} };
      map[key].visits++;
      map[key].total  += parseFloat(r.total) || 0;
      map[key].saved  += parseFloat(r.total_discounts) || 0;
      (r.items || []).forEach(it => map[key].items.push({ ...it, date: r.date }));
      const d = parseDate(r.date);
      if (d && (!map[key].lastDate || d > map[key].lastDate)) map[key].lastDate = d;
      // Track locations by address/zip
      const locKey = [r.zip_code, r.address].filter(Boolean).join(" ").toLowerCase() || null;
      if (locKey) {
        if (!map[key].locations[locKey]) map[key].locations[locKey] = { address: r.address || "", zip_code: r.zip_code || "", visits: 0, total: 0 };
        map[key].locations[locKey].visits++;
        map[key].locations[locKey].total += parseFloat(r.total) || 0;
      }
    });
    return map;
  }, [filtered]);

  const stores = useMemo(() =>
    Object.values(storeMap)
      .filter(s => s.name.toLowerCase().includes(storeQ.toLowerCase()))
      .sort((a, b) => b.total - a.total),
    [storeMap, storeQ]
  );

  const totalAll = stores.reduce((s, st) => s + st.total, 0);

  // ── Drilldown data ──
  const drillStore = activeStore ? storeMap[activeStore] : null;
  const drillItems = useMemo(() => {
    if (!drillStore) return [];
    return drillStore.items.filter(it =>
      (it.name || "").toLowerCase().includes(drillQ.toLowerCase()) &&
      (drillCat === "All" || it.category === drillCat)
    );
  }, [drillStore, drillQ, drillCat]);
  const drillCats = drillStore
    ? ["All", ...new Set(drillStore.items.map(i => i.category).filter(Boolean))]
    : [];

  // ── Store initial letter avatar color ──
  const storeColor = name => {
    const colors = ["#06C167","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#0891B2","#D97706"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
    return colors[Math.abs(h) % colors.length];
  };

  const fmtDate = d => d ? d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Sklepy</h1>
        <p className="page-subtitle">Dodaj paragony, aby zobaczyć analizę sklepów</p>
      </div></div>
      <div className="container">
        <Empty icon="🏪" title="Brak sklepów" sub="Dodaj paragony — każdy sklep otrzyma własną kartę z historią zakupów" />
      </div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner page-hero-flex">
          <div>
            {activeStore ? (
              <>
                <button
                  onClick={() => { setActiveStore(null); setDrillQ(""); setDrillCat("All"); }}
                  className="btn-link-back"
                  aria-label="Wróć do listy sklepów"
                >
                  ← Sklepy
                </button>
                <h1 className="page-title au" style={{ fontSize: "clamp(26px,4vw,42px)" }}>{activeStore}</h1>
                <p className="page-subtitle au1">
                  {drillStore?.visits} wizyt · {drillStore?.items.length} pozycji · ostatnia {fmtDate(drillStore?.lastDate)}
                </p>
              </>
            ) : (
              <>
                <h1 className="page-title au">Moje <span>sklepy</span></h1>
                <p className="page-subtitle au1">{stores.length} sklepów · {filtered.length} paragonów</p>
              </>
            )}
          </div>
          {/* Time range pills */}
          {!activeStore && (
            <div className="pills-row flex-shrink-0" role="group" aria-label="Zakres czasowy">
              {TIME_RANGES.map(tr => (
                <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                  onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                  {tr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20">

          {/* ── LIST MODE ── */}
          {!activeStore && (<>
            {/* Search */}
            <div className="au">
              <label htmlFor="sq" className="sr-only">Szukaj sklepu</label>
              <input id="sq" className="field" value={storeQ} onChange={e => setStoreQ(e.target.value)} placeholder="Szukaj sklepu…" />
            </div>

            {/* Store cards */}
            <div className="flex-col gap-10">
              {stores.length === 0 && (
                <div className="td-empty">Brak wyników</div>
              )}
              {stores.map((st, i) => {
                const pct = totalAll ? (st.total / totalAll * 100) : 0;
                const avg = st.visits ? st.total / st.visits : 0;
                const col = storeColor(st.name);
                return (
                  <button
                    key={st.name}
                    onClick={() => setActiveStore(st.name)}
                    aria-label={`Otwórz ${st.name}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      background: $.glass,
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 20,
                      padding: "18px 22px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "box-shadow .2s, border-color .2s, transform .15s",
                      animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both`,
                      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                    }}
                    onMouseOver={e => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.96)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={e => { e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.72)"; e.currentTarget.style.transform = "none"; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      background: col + "18", border: `1px solid ${col}35`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Bricolage Grotesque',serif", fontSize: 18, fontWeight: 800,
                      color: col, letterSpacing: "-.02em",
                    }}>
                      {st.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="store-name">
                        {st.name}
                      </div>
                      {/* Progress bar */}
                      <div className="flex-row gap-8">
                        <div className="store-progress">
                          <div className="store-progress-fill" style={{ width: `${pct}%`, background: col }} />
                        </div>
                        <span className="store-pct">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="store-meta">
                        <span>{st.visits} wizyt</span>
                        {Object.keys(st.locations).length > 0 && <span>📍 {Object.keys(st.locations).length} lokalizacj{Object.keys(st.locations).length === 1 ? "a" : "e"}</span>}
                        <span>śr. {avg.toFixed(0)} zł/wizyta</span>
                        {st.saved > 0 && <span style={{ color: $.red }}>−{st.saved.toFixed(2)} zł saved</span>}
                        <span className="detail-label">ost. {fmtDate(st.lastDate)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="receipt-total-wrap">
                      <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: col, lineHeight: 1 }}>
                        {st.total.toFixed(2)}
                      </div>
                      <div className="item-sub-sm">zł łącznie</div>
                    </div>

                    <div className="store-chevron">›</div>
                  </button>
                );
              })}
            </div>
          </>)}

          {/* ── DRILLDOWN MODE ── */}
          {activeStore && drillStore && (<>
            {/* Drilldown stats */}
            <div className="stat-grid au stat-grid-3">
              {[
                { l: "Łącznie",    v: drillStore.total.toFixed(2), u: "zł", col: storeColor(activeStore) },
                { l: "Wizyt",      v: drillStore.visits,           u: "",   col: $.ink0 },
                { l: "Zaoszcz.",   v: drillStore.saved.toFixed(2), u: "zł", col: $.red  },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span className="stat-val-unit--sm">{s.u}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Locations */}
            {drillStore && Object.keys(drillStore.locations).length > 0 && (
              <div className="au1 flex-col gap-8">
                <div className="section-heading-sm">
                  Lokalizacje · {Object.keys(drillStore.locations).length}
                </div>
                {Object.values(drillStore.locations).map((loc, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: $.glass, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.72)", borderRadius: 12, padding: "10px 16px",
                  }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <div className="flex-1">
                      <div style={{ fontWeight: 600, fontSize: 13, color: $.ink0 }}>
                        {[loc.address, loc.zip_code].filter(Boolean).join(", ")}
                      </div>
                      <div className="item-sub">{loc.visits} wizyt · {loc.total.toFixed(2)} zł</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drill filters */}
            <div className="au1 flex-col gap-10">
              <input className="field" value={drillQ} onChange={e => setDrillQ(e.target.value)} placeholder={`Szukaj w ${activeStore}…`} />
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                {drillCats.map(dc => (
                  <button key={dc} className={`pill${drillCat === dc ? " on" : ""}`}
                    onClick={() => setDrillCat(dc)} aria-pressed={drillCat === dc}>
                    {dc === "All" ? "Wszystko" : dc}
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown table */}
            <div className="card tbl-wrap au2">
              <table className="tbl" aria-label={`Produkty z ${activeStore}`}>
                <thead>
                  <tr>
                    {["Produkt", "Kategoria", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                      <th key={h} scope="col" className={i >= 3 ? "text-right" : "text-left"}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillItems.length === 0 ? (
                    <tr><td colSpan={7} className="td-no-results">Brak wyników</td></tr>
                  ) : drillItems.map((item, i) => (
                    <tr key={i}>
                      <td className="td-name">{item.name}</td>
                      <td><CatChip cat={item.category} /></td>
                      <td className="mono color-ink3 fs-12">{item.date || "—"}</td>
                      <td className="mono text-right color-ink2 fs-12">{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td className="text-right"><Zl v={item.unit_price} /></td>
                      <td className="text-right">
                        {item.discount
                          ? <span className="mono td-discount-13">−{item.discount.toFixed(2)}</span>
                          : <span className="zl-dash">—</span>}
                      </td>
                      <td className="text-right"><Zl v={item.total_price} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

        </div>
      </div>
    </>
  );
}


/* ─── ExportView ─────────────────────────────── */
function ExportView({ receipts }) {
  const [range,    setRange]    = useState("all");
  const [format,   setFormat]   = useState("items"); // "items" | "receipts"
  const [exported, setExported] = useState(false);

  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(Date.now() - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  const allItems = useMemo(() =>
    filtered.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, date: r.date }))
    ), [filtered]
  );

  const totalSpent = filtered.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const totalSaved = filtered.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  const downloadCSV = () => {
    let rows, headers;

    if (format === "items") {
      headers = ["Produkt","Kategoria","Sklep","Data","Ilość","Jednostka","Cena jedn.","Opust","Razem"];
      rows = allItems.map(it => [
        it.name || "",
        it.category || "",
        it.store || "",
        it.date || "",
        it.quantity ?? 1,
        it.unit || "",
        it.unit_price != null ? parseFloat(it.unit_price).toFixed(2) : "",
        it.discount != null ? parseFloat(it.discount).toFixed(2) : "",
        parseFloat(it.total_price || 0).toFixed(2),
      ]);
    } else {
      headers = ["Sklep","Data","Pozycji","Łącznie","Zaoszczędzono"];
      rows = filtered.map(r => [
        r.store || "",
        r.date || "",
        (r.items || []).length,
        parseFloat(r.total || 0).toFixed(2),
        parseFloat(r.total_discounts || 0).toFixed(2),
      ]);
    }

    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `maszkaapp-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const previewRows = format === "items"
    ? allItems.slice(0, 6)
    : filtered.slice(0, 6);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Eksport <span>danych</span></h1>
          <p className="page-subtitle au1">
            {filtered.length} paragonów · {allItems.length} pozycji · {totalSpent.toFixed(2)} zł
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20" style={{ maxWidth: 780 }}>

          {/* ── Config card ── */}
          <div className="card au card--p28">
            <div className="flex-col gap-24">

              {/* Format */}
              <div>
                <div className="section-heading">
                  Co eksportować
                </div>
                <div className="flex-row flex-wrap gap-10">
                  {[
                    { id: "items",    label: "Pozycje",   sub: "Każdy produkt osobno",   icon: "📦" },
                    { id: "receipts", label: "Paragony",  sub: "Podsumowanie per wizyta", icon: "🧾" },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                      style={{
                        flex: 1, minWidth: 140,
                        padding: "14px 18px",
                        borderRadius: 14,
                        border: `2px solid ${format === f.id ? $.green : "rgba(255,255,255,0.65)"}`,
                        background: format === f.id ? $.greenBg : "rgba(255,255,255,0.45)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all .18s",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <span className="export-format-icon">{f.icon}</span>
                      <div>
                        <div className="export-format-label" style={{ color: format === f.id ? $.green : $.ink0 }}>{f.label}</div>
                        <div className="item-sub">{f.sub}</div>
                      </div>
                      {format === f.id && (
                        <div className="export-check">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range */}
              <div>
                <div className="section-heading">
                  Zakres czasowy
                </div>
                <div className="pills-row" role="group" aria-label="Zakres czasowy">
                  {[...TIME_RANGES].map(tr => (
                    <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                      onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                      {tr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary row */}
              <div className="summary-row">
                {[
                  { l: "Wierszy CSV",    v: (format === "items" ? allItems.length : filtered.length).toLocaleString("pl-PL") },
                  { l: "Kolumn",         v: format === "items" ? "9" : "5" },
                  { l: "Łącznie",        v: `${totalSpent.toFixed(2)} zł` },
                  { l: "Zaoszczędzono",  v: `${totalSaved.toFixed(2)} zł` },
                ].map(s => (
                  <div key={s.l}>
                    <div className="export-stat-label">{s.l}</div>
                    <div className="mono export-stat-val">{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Download button */}
              <button
                className="btn-primary"
                onClick={downloadCSV}
                disabled={!filtered.length}
                style={{ alignSelf: "flex-start", gap: 10, opacity: filtered.length ? 1 : 0.4 }}
                aria-label="Pobierz plik CSV"
              >
                {exported ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8.5L5.5 12L14 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobrano!
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M3.5 7l4 4 4-4M2 13h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobierz CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Preview table ── */}
          {previewRows.length > 0 && (
            <div className="au1">
              <div className="section-heading">
                Podgląd · pierwsze {previewRows.length} wierszy
              </div>
              <div className="card tbl-wrap">
                <table className="tbl" aria-label="Podgląd eksportu">
                  <thead>
                    <tr>
                      {format === "items"
                        ? ["Produkt","Kategoria","Sklep","Data","Razem"].map((h,i) => (
                            <th key={h} scope="col" className={i >= 4 ? "text-right" : "text-left"}>{h}</th>
                          ))
                        : ["Sklep","Data","Pozycji","Łącznie","Zaoszcz."].map((h,i) => (
                            <th key={h} scope="col" className={i >= 2 ? "text-right" : "text-left"}>{h}</th>
                          ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {format === "items"
                      ? (previewRows).map((it, i) => (
                          <tr key={i}>
                            <td className="td-name">{it.name}</td>
                            <td><CatChip cat={it.category} /></td>
                            <td className="color-ink2">{it.store || "—"}</td>
                            <td className="mono color-ink3 fs-12">{it.date || "—"}</td>
                            <td className="text-right"><Zl v={it.total_price} /></td>
                          </tr>
                        ))
                      : (previewRows).map((r, i) => (
                          <tr key={i}>
                            <td className="td-name">{r.store || "—"}</td>
                            <td className="mono color-ink3 fs-12">{r.date || "—"}</td>
                            <td className="mono" style={{ textAlign: "right", color: $.ink2 }}>{(r.items || []).length}</td>
                            <td className="text-right"><Zl v={r.total} /></td>
                            <td className="text-right">
                              {parseFloat(r.total_discounts || 0) > 0
                                ? <span className="mono td-discount-13">−{parseFloat(r.total_discounts).toFixed(2)}</span>
                                : <span className="zl-dash">—</span>}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
                {(format === "items" ? allItems.length : filtered.length) > 6 && (
                  <div className="tbl-footer">
                    + {(format === "items" ? allItems.length : filtered.length) - 6} więcej wierszy w pliku CSV
                  </div>
                )}
              </div>
            </div>
          )}

          {!filtered.length && (
            <Empty icon="📂" title="Brak danych do eksportu" sub="Dodaj paragony, aby móc eksportować dane" />
          )}

        </div>
      </div>
    </>
  );
}


/* ─── BudgetsView ────────────────────────────── */
function BudgetsView({ receipts, expenses = [], allItems = [], budgets, setBudgets, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [editing, setEditing] = useState(null); // cat being edited
  const [editVal, setEditVal] = useState("");

  // Current month spending per category
  const now = new Date();
  const monthItems = useMemo(() => {
    const receiptItems = receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return [];
      return (r.items || []).map(it => ({ ...it }));
    });
    const manualItems = expenses
      .filter(e => {
        const d = parseDate(e.date);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .map(e => ({ name: e.name, total_price: e.amount, category: e.category }));
    return [...receiptItems, ...manualItems];
  }, [receipts, expenses]);

  const spending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => {
      const cat = it.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(it.total_price) || 0);
    });
    return map;
  }, [monthItems]);

  const allCats = Object.keys(CATS);
  const activeCats = allCats.filter(c => spending[c] || budgets[c]);
  const totalBudget = Object.values(budgets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalSpent  = Object.values(spending).reduce((s, v) => s + v, 0);

  const saveEdit = (cat) => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) {
      setBudgets(b => ({ ...b, [cat]: v }));
    } else if (editVal === "" || v === 0) {
      setBudgets(b => { const n = { ...b }; delete n[cat]; return n; });
    }
    setEditing(null); setEditVal("");
  };

  const monthName = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Budżety <span>miesięczne</span></h1>
          <p className="page-subtitle au1">{monthName} · {activeCats.length} kategorii · {convertAmt(totalBudget, currency)} {sym} łącznie</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-20">

          {/* Summary */}
          {totalBudget > 0 && (
            <div className="stat-grid au stat-grid-3">
              {[
                { l: "Budżet łączny",  v: convertAmt(totalBudget, currency), u: sym, col: $.ink0 },
                { l: "Wydano (mies.)", v: convertAmt(totalSpent,  currency), u: sym, col: $.green },
                { l: "Pozostało",      v: convertAmt(Math.max(0, totalBudget - totalSpent), currency), u: sym,
                  col: totalSpent > totalBudget ? $.red : $.green },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span className="stat-val-unit--sm">{s.u}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category budget rows */}
          <div className="card au1 overflow-hidden">
            <div className="section-heading card-head">
              Kategorie — kliknij aby ustawić limit
            </div>
            {allCats.map((cat, i) => {
              const spent   = spending[cat] || 0;
              const budget  = budgets[cat] || 0;
              const pct     = budget ? Math.min(100, (spent / budget) * 100) : 0;
              const over    = budget && spent > budget;
              const catCol  = CATS[cat] || "#9CA3AF";
              const isEditing = editing === cat;

              return (
                <div key={cat} style={{
                  padding: "14px 22px",
                  borderBottom: i < allCats.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none",
                  display: "flex", alignItems: "center", gap: 14,
                  background: over ? "rgba(217,48,37,0.04)" : "transparent",
                  transition: "background .2s",
                }}>
                  {/* Dot */}
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: catCol, flexShrink: 0 }} />

                  {/* Cat name */}
                  <div style={{ width: 110, fontWeight: 600, fontSize: 14, color: $.ink0, flexShrink: 0 }}>{cat}</div>

                  {/* Bar + amounts */}
                  <div className="flex-1">
                    {budget > 0 ? (
                      <>
                        <div className="flex-between" style={{ marginBottom: 5 }}>
                          <span className="mono" style={{ fontSize: 12, color: over ? $.red : $.ink2, fontWeight: over ? 700 : 400 }}>
                            {convertAmt(spent, currency)} {sym}
                          </span>
                          <span className="mono" style={{ fontSize: 12, color: $.ink3 }}>
                            / {convertAmt(budget, currency)} {sym}
                          </span>
                        </div>
                        <div className="budget-bar-track">
                          <div className="budget-bar-fill" style={{
                            width: `${pct}%`,
                            background: over ? $.red : pct > 80 ? $.amber : catCol,
                          }} />
                        </div>
                        {over && (
                          <div className="budget-over-text">
                            Przekroczono o {convertAmt(spent - budget, currency)} {sym}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="budget-no-data">
                        {spent > 0 ? `${convertAmt(spent, currency)} ${sym} wydano` : "Brak wydatków"}
                      </div>
                    )}
                  </div>

                  {/* Edit */}
                  {isEditing ? (
                    <div className="flex-row gap-6 flex-shrink-0">
                      <input
                        autoFocus
                        className="field"
                        type="number"
                        min="0"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(cat); if (e.key === "Escape") { setEditing(null); setEditVal(""); }}}
                        placeholder="Limit zł"
                        style={{ width: 100, padding: "7px 10px", fontSize: 13, minHeight: 36 }}
                        aria-label={`Ustaw budżet dla ${cat}`}
                      />
                      <button className="btn-primary" onClick={() => saveEdit(cat)} style={{ padding: "0 12px", minHeight: 36, fontSize: 13 }}>✓</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditing(cat); setEditVal(budget ? String(budget) : ""); }}
                      className="btn-ghost-sm"
                      onMouseOver={e => { e.currentTarget.style.borderColor = catCol; e.currentTarget.style.color = catCol; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.65)"; e.currentTarget.style.color = $.ink2; }}
                      aria-label={`Edytuj budżet ${cat}`}
                    >
                      {budget > 0 ? "Zmień" : "+ Limit"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="au2 text-muted">
            Budżety są zapisane lokalnie w tej sesji · limity dotyczą bieżącego miesiąca
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── RecurringView ──────────────────────────── */
const REC_CYCLES = ["Miesięcznie","Tygodniowo","Rocznie","Kwartalnie"];

function RecurringView({ recurring, setRecurring, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [form, setForm]   = useState({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.name.trim() || !parseFloat(form.amount)) return;
    setRecurring(r => [...r, { ...form, id: Date.now(), amount: parseFloat(form.amount) }]);
    setForm({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
    setAdding(false);
  };

  // Monthly equivalent
  const toMonthly = (item) => {
    const a = parseFloat(item.amount) || 0;
    const base = { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 };
    return base[item.cycle] || a;
  };
  const [pauseMenu, setPauseMenu] = useState(null);
  const totalMonthly = recurring.filter(r => !isRecurringPaused(r)).reduce((s, r) => s + toMonthly(r) * (FX[currency] || 1), 0);

  const togglePause = (id, pauseUntilDate = null) => {
    setRecurring(r => r.map(item =>
      item.id === id
        ? { ...item, paused: pauseUntilDate ? true : !item.paused, pauseUntil: pauseUntilDate || null }
        : item
    ));
    setPauseMenu(null);
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner page-hero-flex">
          <div>
            <h1 className="page-title au">Cykliczne <span>wydatki</span></h1>
            <p className="page-subtitle au1">
              {recurring.length} pozycji · ~{(totalMonthly).toFixed(2)} {sym}/mies.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setAdding(a => !a)} aria-expanded={adding}>
            {adding ? "✕ Anuluj" : "+ Dodaj"}
          </button>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-14" style={{ maxWidth: 720 }}>

          {/* Add form */}
          {adding && (
            <div className="card au card--p22">
              <div className="section-heading mb-14">Nowy cykliczny wydatek</div>
              <div className="flex-col gap-12">
                <div className="flex-row flex-wrap gap-10">
                  <div className="form-group-lg min-w-160">
                    <label htmlFor="rname" className="field-label-sm">Nazwa</label>
                    <input id="rname" className="field" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Spotify, Siłownia…" onKeyDown={e => e.key === "Enter" && add()} />
                  </div>
                  <div className="form-group min-w-100">
                    <label htmlFor="ramt" className="field-label-sm">Kwota (PLN)</label>
                    <input id="ramt" className="field" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="29.99" />
                  </div>
                </div>
                <div className="flex-row flex-wrap gap-10">
                  <div className="form-group min-w-140">
                    <div className="field-label-sm mb-8">Cykl</div>
                    <div className="pills-row" role="group" aria-label="Cykl płatności">
                      {REC_CYCLES.map(c => (
                        <button key={c} className={`pill${form.cycle === c ? " on" : ""}`} onClick={() => setForm(f => ({...f, cycle: c}))} aria-pressed={form.cycle === c}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group min-w-140">
                    <div className="field-label-sm mb-8">Kategoria</div>
                    <div className="pills-row" role="group" aria-label="Kategoria">
                      {["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Inne"].map(c => (
                        <button key={c} className={`pill${form.category === c ? " on" : ""}`} onClick={() => setForm(f => ({...f, category: c}))} aria-pressed={form.category === c}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="btn-primary" onClick={add}>Zapisz wydatek</button>
              </div>
            </div>
          )}

          {/* Monthly summary */}
          {recurring.length > 0 && (
            <div className="stat-grid au stat-grid-3">
              {[
                { l: "Miesięcznie",  v: totalMonthly.toFixed(2),                              u: sym, col: $.ink0 },
                { l: "Rocznie",      v: (totalMonthly * 12).toFixed(2),                        u: sym, col: $.red  },
                { l: "Pozycji",      v: recurring.length,                                      u: "",  col: $.ink0 },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span className="stat-val-unit--sm">{s.u}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List */}
          {recurring.length === 0 && !adding ? (
            <div style={{ height: 20 }}><Empty icon="🔄" title="Brak cyklicznych wydatków" sub="Dodaj subskrypcje, abonament siłowni, czynsz — wszystko co płacisz regularnie" /></div>
          ) : (
            <div className="flex-col gap-8">
              {recurring.map((item, i) => {
                const monthly = toMonthly(item) * (FX[currency] || 1);
                const catCol = CATS[item.category] || "#9CA3AF";
                const dispAmt = (parseFloat(item.amount) * (FX[currency] || 1)).toFixed(2);
                const paused = isRecurringPaused(item);
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: $.glass,
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.72)",
                    borderRadius: 16, padding: "16px 20px",
                    animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both`,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    opacity: paused ? 0.45 : 1,
                    transition: "opacity .2s",
                  }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: catCol + "18", border: `1px solid ${catCol}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {item.category === "Subskrypcje" ? "📱" : item.category === "Zdrowie" ? "💪" : item.category === "Dom" ? "🏠" : item.category === "Transport" ? "🚗" : item.category === "Rozrywka" ? "🎬" : "🔄"}
                    </div>

                    <div className="flex-1">
                      <div className="item-title-lg">{item.name}</div>
                      <div className="flex-row flex-wrap gap-8" style={{ marginTop: 4 }}>
                        <CatChip cat={item.category} />
                        <span className="rec-badge" style={{ background: catCol + "15", color: catCol, border: `1px solid ${catCol}25` }}>
                          🔄 {item.cycle}
                        </span>
                        {item.cycle !== "Miesięcznie" && (
                          <span className="item-sub-sm">≈ {monthly.toFixed(2)} {sym}/mies.</span>
                        )}
                        {paused && (
                          <span className="paused-badge">
                            ⏸ Wstrzymany{item.pauseUntil ? ` do ${item.pauseUntil}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: catCol, lineHeight: 1 }}>
                        {dispAmt}
                      </div>
                      <div className="item-sub-sm">{sym} / {item.cycle.toLowerCase()}</div>
                    </div>

                    {/* Pause button */}
                    <div className="pos-relative flex-shrink-0">
                      <button onClick={() => setPauseMenu(pauseMenu === item.id ? null : item.id)}
                        className="btn-icon-sm" style={{ color: paused ? "#D97706" : $.ink3 }}
                        aria-label={paused ? `Wznów ${item.name}` : `Wstrzymaj ${item.name}`}>
                        {paused ? "▶" : "⏸"}
                      </button>
                      {pauseMenu === item.id && (
                        <div className="dropdown-menu">
                          {paused ? (
                            <div onClick={() => togglePause(item.id)}
                              className="dropdown-item dropdown-item-green"
                              onMouseOver={e => e.currentTarget.style.background = "#f0fdf4"}
                              onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                              ▶ Wznów
                            </div>
                          ) : (
                            <>
                              <div onClick={() => {
                                const now = new Date();
                                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                togglePause(item.id, end.toISOString().slice(0, 10));
                              }}
                                className="dropdown-item"
                                onMouseOver={e => e.currentTarget.style.background = "#f9fafb"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                ⏸ Wstrzymaj do końca miesiąca
                              </div>
                              <div onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() + 2);
                                togglePause(item.id, d.toISOString().slice(0, 10));
                              }}
                                className="dropdown-item"
                                onMouseOver={e => e.currentTarget.style.background = "#f9fafb"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                ⏸ Wstrzymaj na 2 miesiące
                              </div>
                              <div className="dropdown-item">
                                <label className="dropdown-date-label">Wznów od:</label>
                                <input type="date" className="field" style={{ width: "100%", fontSize: 12 }}
                                  onChange={e => { if (e.target.value) togglePause(item.id, e.target.value); }} />
                              </div>
                              <div onClick={() => togglePause(item.id)}
                                className="dropdown-item dropdown-item-amber"
                                onMouseOver={e => e.currentTarget.style.background = "#fffbeb"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                ⏸ Wstrzymaj bezterminowo
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button onClick={() => setRecurring(r => r.filter(x => x.id !== item.id))}
                      className="btn-icon-sm danger"
                      onMouseOver={e => { e.currentTarget.style.borderColor = $.red; e.currentTarget.style.color = $.red; e.currentTarget.style.background = $.redBg; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.65)"; e.currentTarget.style.color = $.ink3; e.currentTarget.style.background = "none"; }}
                      aria-label={`Usuń ${item.name}`}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── DashboardView ──────────────────────────── */
function DashboardView({ receipts, expenses = [], budgets, recurring, currency, go, allItems = [] }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const now = new Date();

  // allItems comes from App (merged receipts + manual)
  // This month — receipts
  const thisMonth = useMemo(() => receipts.filter(r => {
    const d = parseDate(r.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [receipts]);

  // This month — manual expenses
  const thisMonthExpenses = useMemo(() => expenses.filter(e => {
    const d = parseDate(e.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [expenses]);

  const monthReceiptSpent = thisMonth.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const monthExpenseSpent = thisMonthExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const monthSpent = monthReceiptSpent + monthExpenseSpent;
  const totalSpent = receipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0)
    + expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalSaved = receipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  // Budget alerts
  const monthItems = useMemo(() => {
    const fromReceipts = thisMonth.flatMap(r => r.items || []);
    const fromExpenses = thisMonthExpenses.map(e => ({
      name: e.name, total_price: e.amount, category: e.category,
    }));
    return [...fromReceipts, ...fromExpenses];
  }, [thisMonth, thisMonthExpenses]);
  const monthSpending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => { const c = it.category || "Inne"; map[c] = (map[c] || 0) + (parseFloat(it.total_price) || 0); });
    return map;
  }, [monthItems]);
  const alerts = Object.entries(budgets)
    .filter(([cat, bgt]) => monthSpending[cat] > bgt * 0.8)
    .map(([cat, bgt]) => ({ cat, spent: monthSpending[cat] || 0, budget: bgt, over: monthSpending[cat] > bgt }));

  // Monthly recurring total
  const toMonthly = item => {
    const a = parseFloat(item.amount) || 0;
    return { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 }[item.cycle] || a;
  };
  const recurringMonthly = recurring.filter(r => !isRecurringPaused(r)).reduce((s, r) => s + toMonthly(r), 0);

  // Duplicates: items bought in 2+ stores, find price variance
  const duplicates = useMemo(() => {
    const nameMap = {};
    allItems.forEach(it => {
      if (!it.name) return;
      const key = it.name.toLowerCase().trim();
      if (!nameMap[key]) nameMap[key] = [];
      nameMap[key].push(it);
    });
    return Object.entries(nameMap)
      .filter(([, items]) => {
        const stores = new Set(items.map(i => (i.store || "").trim().toLowerCase()).filter(Boolean));
        return stores.size >= 2;
      })
      .map(([name, items]) => {
        const prices = items.map(i => parseFloat(i.unit_price || i.total_price) || 0).filter(p => p > 0);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        return { name, count: items.length, minP, maxP, savings: maxP - minP };
      })
      .filter(d => d.savings > 0.01)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);
  }, [allItems]);

  // Top 3 most expensive items (reactive — recalculates on every receipt change)
  const top3Items = useMemo(() =>
    [...allItems].sort((a, b) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0)).slice(0, 3),
    [allItems]
  );

  // Recent receipts
  const recent = receipts.slice(0, 3);

  const monthName = now.toLocaleDateString("pl-PL", { month: "long" });

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Cześć! <span>MaszkaApp</span></h1>
          <p className="page-subtitle au1">
            {receipts.length ? `${receipts.length} paragonów · ${allItems.length} pozycji` : "Dodaj pierwszy paragon aby zacząć"}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20">

          {/* ── Main widgets ── */}
          <div className="widget-grid au">
            {/* Total month: receipts + expenses + subscriptions */}
            <div className="widget">
              <div className="widget-label">Razem / miesiąc</div>
              <div className="widget-big" style={{ color: $.green }}>
                {convertAmt(monthSpent + recurringMonthly, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                paragony + subskrypcje · {monthName}
              </div>
              <button onClick={() => go("stats")} className="btn-link" style={{ marginTop: 12 }}>
                Zobacz statystyki →
              </button>
            </div>

            {/* Just receipts */}
            <div className="widget">
              <div className="widget-label">Paragony</div>
              <div className="widget-big" style={{ color: $.ink0 }}>
                {convertAmt(monthReceiptSpent + monthExpenseSpent, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                {thisMonth.length} paragonów{thisMonthExpenses.length > 0 ? ` · ${thisMonthExpenses.length} wydatków` : ""} · {monthName}
              </div>
              <button onClick={() => go("receipts")} className="btn-link" style={{ marginTop: 12 }}>
                Wszystkie paragony →
              </button>
            </div>

            {/* Just subscriptions */}
            <div className="widget">
              <div className="widget-label">Subskrypcje</div>
              <div className="widget-big" style={{ color: $.ink0 }}>
                {convertAmt(recurringMonthly, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                {recurring.length} aktywnych subskrypcji
              </div>
              <button onClick={() => go("recurring")} className="btn-link" style={{ marginTop: 12 }}>
                Zarządzaj →
              </button>
            </div>

            {/* Savings */}
            <div className="widget">
              <div className="widget-label">Zaoszczędzono</div>
              <div className="widget-big" style={{ color: $.red }}>
                {convertAmt(totalSaved, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                dzięki rabatom i promocjom
              </div>
            </div>
          </div>

          {/* ── Budget alerts ── */}
          {alerts.length > 0 && (
            <div className="au1">
              <div className="section-heading">Alerty budżetowe</div>
              <div className="flex-col gap-8">
                {alerts.map(a => (
                  <div key={a.cat} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 20px", borderRadius: 14,
                    background: a.over ? $.redBg : $.amberBg,
                    border: `1px solid ${a.over ? $.redRim : "rgba(217,119,6,0.22)"}`,
                  }}>
                    <span className="alert-icon">{a.over ? "🔴" : "🟡"}</span>
                    <div className="flex-1">
                      <div style={{ fontWeight: 700, fontSize: 14, color: a.over ? $.red : $.amber }}>
                        {a.cat} — {a.over ? "Przekroczono limit!" : "Zbliżasz się do limitu"}
                      </div>
                      <div className="item-sub">
                        {convertAmt(a.spent, currency)} {sym} z {convertAmt(a.budget, currency)} {sym}
                        {" "}({(a.spent / a.budget * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <button onClick={() => go("budgets")} className="btn-ghost-sm">
                      Budżety
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Smart savings (duplicates) ── */}
          {duplicates.length > 0 && (
            <div className="au2">
              <div className="section-heading">Gdzie kupisz taniej</div>
              <div className="card overflow-hidden">
                {duplicates.map((d, i) => (
                  <div key={d.name} style={{
                    padding: "13px 20px",
                    borderBottom: i < duplicates.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div className="icon-box icon-box-36" style={{ background: $.greenBg, border: `1px solid ${$.greenRim}` }}>💡</div>
                    <div className="flex-1">
                      <div className="item-title">{d.name}</div>
                      <div className="item-sub">
                        Cena od <span className="mono">{convertAmt(d.minP, currency)} {sym}</span> do <span className="mono">{convertAmt(d.maxP, currency)} {sym}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: $.green }}>
                        -{convertAmt(d.savings, currency)} {sym}
                      </div>
                      <div className="item-possible-saving">możliwa oszczędność</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Top 3 najdroższe zakupy ── */}
          {top3Items.length > 0 && (
            <div className="au2">
              <div className="section-heading">Top 3 najdroższe zakupy</div>
              <div className="card overflow-hidden">
                {top3Items.map((it, i) => (
                  <div key={i} style={{
                    padding: "13px 20px",
                    borderBottom: i < top3Items.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? "rgba(234,179,8,0.12)" : $.greenBg, border: `1px solid ${i === 0 ? "rgba(234,179,8,0.25)" : $.greenRim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="flex-1">
                      <div className="item-title">{it.name}</div>
                      <div className="item-sub">
                        {it.store || "—"}{it.date ? ` · ${it.date}` : ""}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: $.green, flexShrink: 0 }}>
                      {convertAmt(parseFloat(it.total_price) || 0, currency)} {sym}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent receipts ── */}
          {recent.length > 0 && (
            <div className="au3">
              <div className="flex-between mb-12">
                <div className="section-heading" style={{ marginBottom: 0 }}>Ostatnie paragony</div>
                <button onClick={() => go("receipts")} className="btn-link">Wszystkie →</button>
              </div>
              <div className="flex-col gap-8">
                {recent.map(r => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: $.glass, backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,0.72)", borderRadius: 14, padding: "13px 18px",
                  }}>
                    <div className="icon-box icon-box-38" style={{ background: $.greenBg, border: `1px solid ${$.greenRim}` }}>🧾</div>
                    <div className="flex-1">
                      <div className="item-title">{r.store || "Paragon"}</div>
                      <div className="item-sub">{r.date || "—"} · {(r.items || []).length} pozycji{(r.address || r.zip_code) ? ` · ${[r.zip_code, r.address].filter(Boolean).join(" ")}` : ""}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: $.green, flexShrink: 0 }}>
                      {convertAmt(r.total || 0, currency)} {sym}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty CTA */}
          {receipts.length === 0 && (
            <div className="dash-empty-cta">
              <div className="dash-empty-icon">🌱</div>
              <div className="dash-empty-title">Zacznij od paragonu</div>
              <div className="dash-empty-desc">Dodaj swój pierwszy paragon — Claude automatycznie odczyta produkty, ceny i kategorie.</div>
              <button className="btn-primary" onClick={() => go("receipts")}>
                📸 Skanuj paragon
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}


/* ─── InflationView ──────────────────────────── */
function SparkLine({ points, color, width=120, height=36 }) {
  if (!points || points.length < 2) return null;
  const minV = Math.min(...points), maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - minV) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: "all .5s" }} />
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]}
        r="3" fill={color} />
    </svg>
  );
}

function InflationView({ receipts, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [minOccurrences, setMin] = useState(2);
  const [q, setQ] = useState("");

  // Group items by name + date, track unit_price over time
  const priceHistory = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const d = parseDate(r.date);
      if (!d) return;
      const dateKey = r.date;
      (r.items || []).forEach(it => {
        if (!it.name) return;
        const key = it.name.toLowerCase().trim();
        if (!map[key]) map[key] = { name: it.name, entries: [] };
        const price = parseFloat(it.unit_price || it.total_price) || 0;
        if (price > 0) map[key].entries.push({ date: d, dateKey, price, store: r.store });
      });
    });
    return Object.values(map)
      .filter(p => p.entries.length >= minOccurrences)
      .map(p => {
        const sorted = [...p.entries].sort((a, b) => a.date - b.date);
        const prices  = sorted.map(e => e.price);
        const first   = prices[0], last = prices[prices.length - 1];
        const change  = first > 0 ? ((last - first) / first) * 100 : 0;
        return { ...p, sorted, prices, first, last, change };
      })
      .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [receipts, minOccurrences, q]);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Inflacja <span>cenowa</span></h1>
          <p className="page-subtitle au1">Jak zmieniają się ceny tych samych produktów w czasie</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-16">

          {/* Filters */}
          <div className="au flex-row flex-wrap gap-10 flex-end">
            <div className="form-group min-w-180">
              <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Szukaj produktu…" />
            </div>
            <div className="flex-row gap-6">
              <span className="date-label">Min. zakupów:</span>
              {[2,3,5].map(n => (
                <button key={n} className={`pill${minOccurrences === n ? " on" : ""}`}
                  onClick={() => setMin(n)} style={{ padding:"6px 12px" }}>{n}+</button>
              ))}
            </div>
          </div>

          {priceHistory.length === 0 ? (
            <Empty icon="📈" title="Za mało danych"
              sub={`Potrzebujesz co najmniej ${minOccurrences} zakupów tego samego produktu w różnych datach`} />
          ) : (
            <div className="card au1 overflow-hidden">
              <div className="tbl-wrap">
                <table className="tbl" aria-label="Zmiany cen produktów">
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign:"left" }}>Produkt</th>
                      <th scope="col" className="field--text-right">Pierwsza cena</th>
                      <th scope="col" className="field--text-right">Ostatnia cena</th>
                      <th scope="col" className="field--text-right">Zmiana</th>
                      <th scope="col" style={{ textAlign:"center" }}>Trend</th>
                      <th scope="col" className="field--text-right">Zakupów</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.slice(0, 40).map((p, i) => {
                      const up    = p.change > 0.5;
                      const down  = p.change < -0.5;
                      const color = up ? $.red : down ? $.green : $.ink3;
                      const arrow = up ? "↑" : down ? "↓" : "→";
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight:600 }}>{p.name}</td>
                          <td className="field--text-right">
                            <Zl v={p.first} />
                          </td>
                          <td className="field--text-right">
                            <span className="mono" style={{ fontWeight: up||down ? 700:400, color }}>{(p.last*(FX[currency]||1)).toFixed(2)} {sym}</span>
                          </td>
                          <td className="field--text-right">
                            <span className="mono" style={{ fontSize:13, fontWeight:700, color }}>
                              {arrow} {Math.abs(p.change).toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ textAlign:"center", padding:"8px 12px" }}>
                            <SparkLine points={p.prices} color={color} width={100} height={28} />
                          </td>
                          <td className="field--text-right mono">
                            <span style={{ color:$.ink3, fontSize:12 }}>{p.entries.length}×</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="au2 text-muted">
            Porównanie ceny jednostkowej pierwszego i ostatniego zakupu tego samego produktu
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── PredictionView ─────────────────────────── */
function PredictionView({ receipts, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";

  // Build last 6 months of data
  const monthlyData = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const d = parseDate(r.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map[key] = (map[key]||0) + (parseFloat(r.total)||0);
    });
    const sorted = Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
    const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return sorted.map(([key, total]) => {
      const [y, m] = key.split("-");
      return { key, label: MONTH_NAMES[parseInt(m,10)-1] + " '" + y.slice(2), total };
    });
  }, [receipts]);

  // Simple linear regression on last months
  const prediction = useMemo(() => {
    const data = monthlyData.slice(-6);
    if (data.length < 2) return null;
    const n = data.length;
    const xs = data.map((_, i) => i);
    const ys = data.map(d => d.total);
    const sumX  = xs.reduce((s,x) => s+x, 0);
    const sumY  = ys.reduce((s,y) => s+y, 0);
    const sumXY = xs.reduce((s,x,i) => s+x*ys[i], 0);
    const sumX2 = xs.reduce((s,x) => s+x*x, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    const predicted = slope * n + intercept;
    const avg = sumY / n;
    const trend = slope > avg * 0.03 ? "rosnący" : slope < -avg * 0.03 ? "malejący" : "stabilny";
    const trendColor = slope > avg * 0.03 ? $.red : slope < -avg * 0.03 ? $.green : $.ink2;
    return { predicted: Math.max(0, predicted), avg, slope, trend, trendColor, data };
  }, [monthlyData]);

  // Category breakdown prediction
  const catPrediction = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const recentMonths = 2;
    const cutoff = monthlyData.slice(-recentMonths);
    const keys = new Set(cutoff.map(m => m.key));
    const recentItems = receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d) return [];
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!keys.has(key)) return [];
      return (r.items||[]).map(it => ({ ...it }));
    });
    const catMap = {};
    recentItems.forEach(it => {
      const cat = it.category || "Inne";
      catMap[cat] = (catMap[cat]||0) + (parseFloat(it.total_price)||0);
    });
    const total = Object.values(catMap).reduce((s,v)=>s+v,0);
    return Object.entries(catMap)
      .map(([cat, v]) => ({ cat, v: v/recentMonths, pct: total ? v/total*100 : 0, color: CATS[cat]||"#9CA3AF" }))
      .sort((a,b) => b.v - a.v)
      .slice(0, 8);
  }, [receipts, monthlyData]);

  const maxBar = monthlyData.length ? Math.max(...monthlyData.slice(-6).map(m=>m.total), prediction?.predicted||0, 1) : 1;
  const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
  const nextMonth = MONTH_NAMES[(new Date().getMonth()+1) % 12];

  if (monthlyData.length < 2) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
        <p className="page-subtitle">Potrzebujesz co najmniej 2 miesięcy danych</p>
      </div></div>
      <div className="container">
        <Empty icon="🔮" title="Za mało danych" sub="Dodaj paragony z co najmniej 2 różnych miesięcy aby zobaczyć prognozę" />
      </div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
          <p className="page-subtitle au1">Prognoza na {nextMonth} na podstawie Twoich danych</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-20">

          {/* Hero prediction card */}
          {prediction && (
            <div className="card au card--p32" style={{ position:"relative", overflow:"hidden" }}>
              <div className="prediction-circle" />
              <div className="section-heading">
                Prognozowane wydatki — {nextMonth}
              </div>
              <div className="prediction-amount">
                {convertAmt(prediction.predicted, currency)}
                <span className="prediction-amount-unit">{sym}</span>
              </div>
              <div className="flex-row flex-wrap gap-24">
                <div>
                  <div className="prediction-stat-label">Trend</div>
                  <div style={{ fontSize:16, fontWeight:700, color:prediction.trendColor, marginTop:4 }}>
                    {prediction.trend === "rosnący" ? "↑" : prediction.trend === "malejący" ? "↓" : "→"} {prediction.trend}
                  </div>
                </div>
                <div>
                  <div className="prediction-stat-label">Średnia miesięczna</div>
                  <div className="mono" style={{ fontSize:16, fontWeight:700, color:$.ink0, marginTop:4 }}>
                    {convertAmt(prediction.avg, currency)} {sym}
                  </div>
                </div>
                <div>
                  <div className="prediction-stat-label">Zmiana vs śr.</div>
                  <div className="mono" style={{ fontSize:16, fontWeight:700, color: prediction.predicted > prediction.avg ? $.red : $.green, marginTop:4 }}>
                    {prediction.predicted > prediction.avg ? "+" : ""}{convertAmt(prediction.predicted - prediction.avg, currency)} {sym}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bar chart - history + prediction */}
          <div className="card au1" style={{ padding: "24px" }}>
            <div className="section-heading mb-20">
              Historia + prognoza
            </div>
            <div className="flex-row" style={{ alignItems:"flex-end", gap:10, height:120 }}>
              {monthlyData.slice(-6).map((m, i) => {
                const h = Math.max(8, (m.total / maxBar) * 100);
                return (
                  <div key={m.key} className="pred-bar-col">
                    <span className="mono pred-bar-amt">{convertAmt(m.total, currency)}</span>
                    <div style={{ width:"100%", height:h, background:"rgba(6,193,103,0.25)", borderRadius:"6px 6px 0 0",
                      transition:`height .7s cubic-bezier(.16,1,.3,1) ${i*.05}s` }} />
                    <span className="pred-bar-label">{m.label}</span>
                  </div>
                );
              })}
              {/* Prediction bar */}
              {prediction && (
                <div className="pred-bar-col">
                  <span className="mono" style={{ fontSize:10, color:$.green, fontWeight:700 }}>{convertAmt(prediction.predicted, currency)}</span>
                  <div style={{ width:"100%", height: Math.max(8,(prediction.predicted/maxBar)*100),
                    background:$.green, borderRadius:"6px 6px 0 0", opacity:0.7,
                    border:`2px dashed ${$.green}`, boxSizing:"border-box",
                    transition:"height .7s cubic-bezier(.16,1,.3,1) .35s" }} />
                  <span style={{ fontSize:10, color:$.green, fontWeight:700 }}>{nextMonth} ✦</span>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {catPrediction.length > 0 && (
            <div className="card au2 card--p24">
              <div className="section-heading mb-16">
                Prognoza per kategoria (śr. ostatnie 2 mies.)
              </div>
              <div className="flex-col gap-10">
                {catPrediction.map(cp => (
                  <div key={cp.cat} className="pred-cat-row">
                    <div className="legend-dot" style={{ background:cp.color }} />
                    <div className="pred-cat-name">{cp.cat}</div>
                    <div className="pred-cat-bar">
                      <div className="pred-cat-fill" style={{ width:`${cp.pct}%`, background:cp.color }} />
                    </div>
                    <span className="mono" style={{ fontSize:12, color:$.ink2, width:80, textAlign:"right", flexShrink:0 }}>
                      {convertAmt(cp.v, currency)} {sym}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-muted">
            Prognoza oparta na regresji liniowej z ostatnich {Math.min(6, monthlyData.length)} miesięcy
          </p>
        </div>
      </div>
    </>
  );
}


/* ─── Onboarding Overlay ─────────────────────── */
const ONBOARD_STEPS = [
  { icon:"📸", title:"Skanuj paragon", desc:"Dodaj zdjęcie paragonu — Claude automatycznie odczyta produkty, ceny i rabaty." },
  { icon:"📊", title:"Analizuj wydatki", desc:"Wykresy, statystyki, porównanie sklepów i inflacja cenowa w jednym miejscu." },
  { icon:"💰", title:"Kontroluj budżet", desc:"Ustaw limity per kategorię i śledź cykliczne wydatki jak subskrypcje." },
  { icon:"🔮", title:"Przewiduj przyszłość", desc:"AI prognozuje Twoje wydatki i sugeruje tygodniowy plan posiłków." },
];

function OnboardingOverlay({ onDone, darkMode }) {
  const [step, setStep] = useState(0);
  const current = ONBOARD_STEPS[step];
  const isLast  = step === ONBOARD_STEPS.length - 1;

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="Witaj w MaszkaApp">
      <div className="onboard-card">
        {/* Logo */}
        <div className="onboard-logo-row">
          <div className="onboard-logo-dot" />
          <span className="onboard-logo-text">MaszkaApp</span>
          <span className="onboard-step-counter">{step+1} / {ONBOARD_STEPS.length}</span>
        </div>

        {/* Step icon */}
        <div className="onboard-step-icon" key={step}>
          {current.icon}
        </div>

        {/* Title */}
        <div className="onboard-step-title" key={step+"t"}>
          {current.title}
        </div>

        {/* Desc */}
        <div className="onboard-step-desc" key={step+"d"}>
          {current.desc}
        </div>

        {/* Dots */}
        <div className="onboard-dots">
          {ONBOARD_STEPS.map((_,i) => (
            <button key={i} onClick={() => setStep(i)} aria-label={`Krok ${i+1}`}
              className={`onboard-dot ${i===step ? "onboard-dot--active" : "onboard-dot--inactive"}`} />
          ))}
        </div>

        {/* Buttons */}
        <div className="onboard-btns">
          {!isLast ? (
            <>
              <button onClick={onDone}
                className="onboard-skip">
                Pomiń
              </button>
              <button onClick={() => setStep(s => s+1)}
                className="btn-primary onboard-next">
                Dalej →
              </button>
            </>
          ) : (
            <button onClick={onDone} className="btn-primary onboard-start">
              ✦ Zaczynamy!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── QuickAddExpense ────────────────────────── */

function QuickAddExpense({ onAdd, onClose, onTextReceipt, apiKey, onNeedKey, customStores, onAddCustomStore }) {
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
                style={{ width:"100%", justifyContent:"center", minHeight:52, fontSize:16, marginTop:14,
                  opacity: textVal.trim() ? 1 : 0.4 }}
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
                      <div className="fw-700" style={{ fontSize: 14, color: type===t.id ? $.green : $.ink0, letterSpacing: "-.01em" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: $.ink3, marginTop: 1 }}>{t.sub}</div>
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
                  <input id="qa-qty" className="field" type="number" min="0" step="0.01"
                    value={quantity} onChange={e => setQuantity(e.target.value)}
                    placeholder="1" style={{ textAlign: "right" }} />
                </div>
                <div className="form-group min-w-60">
                  <label htmlFor="qa-unit" className="field-label">Jedn.</label>
                  <input id="qa-unit" className="field" value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="szt, kg, l…" />
                </div>
                <div className="form-group min-w-90">
                  <label htmlFor="qa-uprice" className="field-label">Cena jedn.</label>
                  <input id="qa-uprice" className="field" type="number" min="0" step="0.01"
                    value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                    placeholder="0.00" style={{ textAlign: "right" }} />
                </div>
              </div>

              {/* Discount + Total row */}
              <div className="form-row">
                <div className="form-group min-w-80">
                  <label htmlFor="qa-disc" className="field-label">Zniżka (zł)</label>
                  <input id="qa-disc" className="field" type="number" min="0" step="0.01"
                    value={discount} onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00" style={{ textAlign: "right" }} />
                </div>
                <div className="form-group min-w-80">
                  <label htmlFor="qa-disclbl" className="field-label">Opis zniżki</label>
                  <input id="qa-disclbl" className="field" value={discountLabel}
                    onChange={e => setDiscountLabel(e.target.value)}
                    placeholder="np. Karta Moja" />
                </div>
                <div className="form-group min-w-90">
                  <label htmlFor="qa-amt" className="field-label">Razem (PLN)</label>
                  <input id="qa-amt" className="field" type="number" min="0" step="0.01"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && submit()} placeholder="0.00" style={{ textAlign: "right" }} />
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
                <div className="pills-row" style={{ marginBottom: 10 }} role="group" aria-label="Grupa kategorii">
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
                style={{ width:"100%", justifyContent:"center", minHeight:52, fontSize:16, opacity: name.trim() && parseFloat(amount) ? 1 : 0.4 }}
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

/* ─── ExpensesView (unified manual + receipts) ── */
function ExpensesView({ expenses, receipts, recurring = [], onDelete, currency }) {
  const sym = FX_SYMBOLS[currency] || "zł";
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("All");
  const [src, setSrc] = useState("All"); // All | manual | receipt | recurring
  const [sort,setSort] = useState("date"); // date | amount | name
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  // Merge manual expenses + receipt items + recurring
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
      unit_price: null, quantity: null, discount: null,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({
        ...it, store: r.store, date: r.date, source: "receipt", type: "one-time", note: null,
      }))
    ),
    ...recurring.filter(r => !isRecurringPaused(r)).map(r => ({
      id: r.id, name: r.name, total_price: r.amount, category: r.category,
      date: null, store: null, note: r.cycle, source: "recurring", type: "recurring",
      unit_price: null, quantity: null, discount: null,
    })),
  ], [expenses, receipts, recurring]);

  const cats = useMemo(() => [...new Set(allItems.map(i => i.category).filter(Boolean))], [allItems]);

  const list = useMemo(() => {
    let out = allItems.filter(i =>
      (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
      (cat === "All" || i.category === cat) &&
      (src === "All" || i.source === src) &&
      (!dateFrom || (i.date || "") >= dateFrom) &&
      (!dateTo || (i.date || "") <= dateTo)
    );
    if (sort === "date") out = [...out].sort((a,b) => (b.date||"").localeCompare(a.date||""));
    if (sort === "amount") out = [...out].sort((a,b) => (parseFloat(b.total_price)||0) - (parseFloat(a.total_price)||0));
    if (sort === "name") out = [...out].sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return out;
  }, [allItems, q, cat, src, sort, dateFrom, dateTo]);

  const totalManual  = expenses.reduce((s,e) => s + e.amount, 0);
  const totalReceipt = receipts.reduce((s,r) => s + (parseFloat(r.total)||0), 0);
  const totalAll     = totalManual + totalReceipt;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Wszystkie <span>wydatki</span></h1>
          <p className="page-subtitle au1">{allItems.length} pozycji · {convertAmt(totalAll, currency)} {sym} łącznie</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-16">

          {/* Stats */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l:"Łącznie",      v:convertAmt(totalAll,    currency), u:sym, col:$.ink0  },
              { l:"Ręcznie",      v:convertAmt(totalManual, currency), u:sym, col:$.green },
              { l:"Z paragonów",  v:convertAmt(totalReceipt,currency), u:sym, col:"#3B82F6" },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color:s.col }}>
                  {s.v}<span style={{ fontSize:15, color:$.ink3, marginLeft:3 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="au1 flex-col gap-10">
            <div className="onboard-btns">
              <input className="field" value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Szukaj wydatku…" style={{ flex:1 }} />
              <select className="field" value={sort} onChange={e=>setSort(e.target.value)}
                style={{ width:"auto", flex:"none", minWidth:130, cursor:"pointer" }}
                aria-label="Sortuj">
                <option value="date">Data ↓</option>
                <option value="amount">Kwota ↓</option>
                <option value="name">Nazwa A–Z</option>
              </select>
            </div>

            {/* Source toggle */}
            <div className="pills-row" role="group" aria-label="Źródło">
              {[["All","Wszystko"],["manual","✏️ Ręczne"],["receipt","🧾 Paragony"],["recurring","🔄 Cykliczne"]].map(([id,lbl])=>(
                <button key={id} className={`pill${src===id?" on":""}`}
                  onClick={()=>setSrc(id)} aria-pressed={src===id}>{lbl}</button>
              ))}
            </div>

            {/* Category filter */}
            <div className="pills-row" role="group" aria-label="Kategoria">
              <button className={`pill${cat==="All"?" on":""}`} onClick={()=>setCat("All")} aria-pressed={cat==="All"}>Wszystkie kat.</button>
              {cats.map(c => (
                <button key={c} className={`pill${cat===c?" on":""}`} onClick={()=>setCat(c)} aria-pressed={cat===c}>
                  {CAT_ICONS[c]||"📦"} {c}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="date-filter-row">
              <label className="date-label">Od:</label>
              <input className="field" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ flex:1, minWidth:130 }} />
              <label className="date-label">Do:</label>
              <input className="field" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ flex:1, minWidth:130 }} />
              {(dateFrom || dateTo) && (
                <button className="pill" onClick={()=>{ setDateFrom(""); setDateTo(""); }} style={{ whiteSpace:"nowrap" }}>✕ Wyczyść</button>
              )}
            </div>
          </div>

          {/* List — collapsible cards */}
          {list.length === 0 ? (
            <Empty icon="📋" title="Brak wyników" sub="Spróbuj zmienić filtry lub dodaj pierwszy wydatek przyciskiem +" />
          ) : (
            <div className="au2 flex-col gap-8">
              {list.map((item, i) => {
                const isOpen = expanded === i;
                return (
                  <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                    style={{
                      background: $.glass,
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 16, padding: "14px 18px",
                      cursor: "pointer",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                      transition: "all .2s ease",
                    }}>

                    {/* Collapsed row */}
                    <div className="expense-row">
                      <span className="expense-icon">{CAT_ICONS[item.category]||"📦"}</span>
                      <div className="flex-1">
                        <div className="expense-name">{item.name}</div>
                        <div className="item-sub-sm">
                          {item.source==="recurring" ? "cykliczny" : (item.date||"—")}
                          {" · "}
                          {item.source==="recurring" ? "🔄" : item.source==="manual" ? "✏️" : "🧾"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="mono" style={{ fontWeight:600, fontSize:15 }}>
                          {convertAmt(item.total_price||0, currency)} {sym}
                        </span>
                        {item.discount > 0 && (
                          <div style={{ fontSize:11, color:$.red, fontWeight:600 }}>−{convertAmt(item.discount, currency)}</div>
                        )}
                      </div>
                      <span style={{ fontSize:12, color:$.ink3, transition:"transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink:0 }}>▼</span>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div onClick={e => e.stopPropagation()}
                        className="expense-detail-grid">
                        <div><span className="detail-label">Kategoria:</span> <CatChip cat={item.category} /></div>
                        <div>
                          <span className="detail-label">Źródło: </span>
                          <span className={`source-badge source-badge-${item.source}`}>
                            {item.source==="recurring" ? "🔄 Cykliczny" : item.source==="manual" ? "✏️ Ręczny" : "🧾 Paragon"}
                          </span>
                        </div>
                        {item.store && <div><span className="detail-label">Sklep:</span> {item.store}</div>}
                        {item.quantity && <div><span className="detail-label">Ilość:</span> {item.quantity}{item.unit ? ` ${item.unit}` : ""}</div>}
                        {item.unit_price && <div><span className="detail-label">Cena jedn.:</span> {convertAmt(item.unit_price, currency)} {sym}</div>}
                        {item.discount > 0 && <div style={{ color:$.red }}><span>Zniżka:</span> −{convertAmt(item.discount, currency)} {sym}</div>}
                        {item.note && <div className="detail-full" style={{ color:$.ink2 }}><span className="detail-label">Notatka:</span> {item.note}</div>}
                        {item.source==="manual" && (
                          <div className="detail-full" style={{ marginTop: 4 }}>
                            <button onClick={() => { haptic(10); onDelete(item.id); }}
                              className="btn-delete">
                              🗑️ Usuń
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Nav config ─────────────────────────────── */



export default function App({ uid }) {
  const [view,      setView]      = useState("home");
  const [receipts,  setReceipts]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [processing,setProcessing]= useState([]);
  const [errors,    setErrors]    = useState([]);
  const [budgets,   setBudgets]   = useState({});
  const [recurring, setRecurring] = useState([]);
  const [customStores, setCustomStores] = useState([]);
  const [currency,  setCurrency]  = useState("PLN");
  const [darkMode,  setDarkMode]  = useState(() => lsGet(LS_KEYS.darkMode, false));
  const [onboarded, setOnboarded] = useState(false);
  const [showQA,    setShowQA]    = useState(false);
  const [apiKey,    setApiKey]    = useState(() => lsGet(LS_KEYS.apiKey, ""));
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]); // receipts awaiting user approval
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pendingFilesRef = useRef(null);
  const pageRef = useRef();
  const initialLoadDone = useRef(false);
  const reviewQueueRef = useRef(reviewQueue);
  reviewQueueRef.current = reviewQueue;

  // Counter of in-flight local writes — when >0 we skip onSnapshot echoes
  const pendingWrites = useRef(0);

  // Load data from Firestore on mount, then subscribe to real-time updates
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;

        if (data === null) {
          // No Firestore data — migrate from localStorage
          const migrated = {
            receipts:    lsGet(LS_KEYS.receipts, []),
            expenses:    lsGet(LS_KEYS.expenses, []),
            budgets:     lsGet(LS_KEYS.budgets, {}),
            recurring:   lsGet(LS_KEYS.recurring, []),
            currency:    lsGet(LS_KEYS.currency, "PLN"),
            darkMode:    lsGet(LS_KEYS.darkMode, false),
            onboarded:   lsGet(LS_KEYS.onboarded, false),
            corrections: lsGet(LS_KEYS.corrections, { names: {}, categories: {} }),
          };
          await saveAllUserData(uid, migrated);
          // Verify migration succeeded before clearing localStorage
          const verify = await loadUserData(uid);
          if (verify && (verify.receipts || []).length >= (migrated.receipts || []).length) {
            Object.entries(LS_KEYS).forEach(([k, v]) => {
              if (k !== "apiKey") localStorage.removeItem(v);
            });
          }
          applyData(migrated);
        } else {
          // Check if localStorage has receipts that Firestore is missing (recovery)
          const lsReceipts = lsGet(LS_KEYS.receipts, []);
          if (lsReceipts.length > 0 && (data.receipts || []).length === 0) {
            data.receipts = lsReceipts;
            await saveAllUserData(uid, { receipts: lsReceipts });
          } else if (lsReceipts.length > 0) {
            // Merge any localStorage receipts not already in Firestore (by id)
            const existingIds = new Set((data.receipts || []).map(r => r.id));
            const missing = lsReceipts.filter(r => !existingIds.has(r.id));
            if (missing.length > 0) {
              data.receipts = [...missing, ...(data.receipts || [])];
              await saveAllUserData(uid, { receipts: data.receipts });
            }
          }
          applyData(data);
        }
        setDataLoaded(true);

        // Subscribe to real-time Firestore updates (cross-tab / cross-device sync)
        if (!cancelled) {
          unsubscribe = subscribeUserData(uid, (remoteData) => {
            // Skip echoes of our own local writes
            if (pendingWrites.current > 0) return;
            applyData(remoteData);
          });
        }
      } catch (e) {
        console.error("Failed to load data from Firestore:", e);
        setErrors(["Nie udało się załadować danych. Odśwież stronę."]);
        setLoadFailed(true);
        setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [uid]);

  function applyData(d) {
    setReceipts(d.receipts || []);
    setExpenses(d.expenses || []);
    setBudgets(d.budgets || {});
    setRecurring(d.recurring || []);
    setCustomStores(d.customStores || []);
    setCurrency(d.currency || "PLN");
    setDarkMode(d.darkMode || false);
    setOnboarded(d.onboarded || false);
    initCorrections(uid, d.corrections);
  }

  // Persist to Firestore on change (skip initial load; NEVER write if load failed)
  useEffect(() => {
    if (dataLoaded && !loadFailed) initialLoadDone.current = true;
  }, [dataLoaded, loadFailed]);

  // Track previous values so we skip the redundant write-back that fires
  // in the same render cycle where data loads from Firestore.  Without this,
  // a stale "write loaded data back" can race with the user's first edit and
  // overwrite it, causing receipts to vanish on refresh.
  const prevReceipts  = useRef(null);
  const prevExpenses  = useRef(null);
  const prevBudgets   = useRef(null);
  const prevRecurring = useRef(null);
  const prevCurrency  = useRef(null);
  const prevDarkMode  = useRef(null);
  const prevOnboarded = useRef(null);

  // Write to Firestore while guarding against onSnapshot echo loops
  const guardedWrite = useCallback((field, value) => {
    pendingWrites.current++;
    updateField(uid, field, value).finally(() => {
      setTimeout(() => { pendingWrites.current = Math.max(0, pendingWrites.current - 1); }, 1500);
    });
  }, [uid]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      // Even before Firestore load completes (or if it fails), save non-empty
      // receipts to localStorage so they survive a refresh and can be recovered
      if (receipts.length > 0) lsSet(LS_KEYS.receipts, receipts);
      return;
    }
    if (prevReceipts.current === null) { prevReceipts.current = receipts; return; }
    prevReceipts.current = receipts;
    guardedWrite("receipts", receipts);
    lsSet(LS_KEYS.receipts, receipts);
  }, [receipts]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevExpenses.current === null) { prevExpenses.current = expenses; return; }
    prevExpenses.current = expenses;
    guardedWrite("expenses", expenses);
  }, [expenses]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevBudgets.current === null) { prevBudgets.current = budgets; return; }
    prevBudgets.current = budgets;
    guardedWrite("budgets", budgets);
  }, [budgets]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevRecurring.current === null) { prevRecurring.current = recurring; return; }
    prevRecurring.current = recurring;
    guardedWrite("recurring", recurring);
  }, [recurring]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    guardedWrite("customStores", customStores);
  }, [customStores]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevCurrency.current === null) { prevCurrency.current = currency; return; }
    prevCurrency.current = currency;
    guardedWrite("currency", currency);
  }, [currency]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevDarkMode.current === null) { prevDarkMode.current = darkMode; return; }
    prevDarkMode.current = darkMode;
    guardedWrite("darkMode", darkMode);
    lsSet(LS_KEYS.darkMode, darkMode);
  }, [darkMode]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevOnboarded.current === null) { prevOnboarded.current = onboarded; return; }
    prevOnboarded.current = onboarded;
    guardedWrite("onboarded", onboarded);
  }, [onboarded]);

  // Unified allItems: manual expenses + receipt items
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, address: r.address, zip_code: r.zip_code, date: r.date, source: "receipt" }))
    ),
  ], [expenses, receipts]);

  const addExpense = useCallback((exp) => {
    if (exp.type === "recurring") {
      setRecurring(r => [...r, { ...exp, amount: exp.amount, cycle: exp.cycle || "Miesięcznie" }]);
    } else {
      setExpenses(e => [exp, ...e]);
    }
  }, []);

  // Sync dark mode to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-dark", darkMode ? "1" : "0");
  }, [darkMode]);

  const processFiles = useCallback(async (files, key) => {
    for (const file of files) {
      const id = Date.now() + Math.random();
      setProcessing(p => [...p, { id, name: file.name }]);
      try {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const parsed = await scanReceiptAPI(b64, file.type, key, getCorrectionsHint(getCorrections()));
        const corrected = applyLearnedCorrections(parsed);
        // Enqueue for review instead of overwriting
        setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
        haptic(30);
      } catch (e) {
        setErrors(p => [...p, `${file.name}: ${e.message}`]);
      } finally {
        setProcessing(p => p.filter(x => x.id !== id));
      }
    }
  }, []);

  const handleFiles = useCallback(async files => {
    if (!apiKey) {
      pendingFilesRef.current = files;
      setShowKeyModal(true);
      return;
    }
    processFiles(files, apiKey);
  }, [apiKey, processFiles]);

  useEffect(() => {
    if (apiKey && pendingFilesRef.current) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = null;
      processFiles(files, apiKey);
    }
  }, [apiKey, processFiles]);

  const go = id => {
    setView(id);
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalItems = allItems.length;
  const currentView = VIEWS.find(v => v.id === view);

  if (!dataLoaded) return (
    <div className="loading-screen">
      <div>
        <div className="loading-icon">🧾</div>
        <div className="loading-text">Ładowanie danych...</div>
      </div>
    </div>
  );

  return (
    <>
      {/* CSS loaded via src/styles/index.css in main.jsx */}

      {/* Onboarding */}
      {!onboarded && <OnboardingOverlay onDone={() => { setOnboarded(true); haptic(30); }} darkMode={darkMode} />}

      {/* Quick Add Drawer */}
      {showQA && (
        <QuickAddExpense
          onAdd={addExpense}
          onClose={() => setShowQA(false)}
          apiKey={apiKey}
          onNeedKey={() => setShowKeyModal(true)}
          customStores={customStores}
          onAddCustomStore={s => { if (s && !customStores.includes(s) && !DEFAULT_STORES.includes(s)) setCustomStores(cs => [...cs, s]); }}
          onTextReceipt={async (text) => {
            setShowQA(false);
            const id = Date.now() + Math.random();
            setProcessing(p => [...p, { id, name: "Analiza tekstu..." }]);
            try {
              const parsed = await parseTextReceiptAPI(text, apiKey, getCorrectionsHint(getCorrections()));
              const corrected = applyLearnedCorrections(parsed);
              setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
              haptic(30);
            } catch (e) {
              setErrors(p => [...p, `Tekst: ${e.message}`]);
            } finally {
              setProcessing(p => p.filter(x => x.id !== id));
            }
          }}
        />
      )}

      {/* Receipt Review Modal — processes queue one at a time */}
      {reviewQueue.length > 0 && (
        <ReceiptReviewModal
          key={reviewQueue[0].id}
          receipt={reviewQueue[0]}
          onConfirm={(reviewed) => {
            const current = reviewQueueRef.current[0];
            if (current) {
              // Learn from user corrections vs original AI parse
              if (current._original) {
                learnFromCorrections(current._original, reviewed);
              }
              const { _original, ...rest } = current;
              setReceipts(p => [{ ...reviewed, id: rest.id }, ...p]);
            }
            setReviewQueue(q => q.slice(1));
            haptic(30);
          }}
          onCancel={() => setReviewQueue(q => q.slice(1))}
          customStores={customStores}
          onAddCustomStore={s => { if (s && !customStores.includes(s) && !DEFAULT_STORES.includes(s)) setCustomStores(cs => [...cs, s]); }}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="apikey-overlay"
          onClick={() => setShowKeyModal(false)}>
          <div className={`apikey-box ${darkMode ? "apikey-box-dark" : "apikey-box-light"}`}
            onClick={e => e.stopPropagation()}>
            <div className="apikey-title" style={{ color: darkMode ? "#fff" : $.ink0 }}>Klucz API Anthropic</div>
            <div className="apikey-desc" style={{ color: darkMode ? "#aaa" : $.ink2 }}>
              Wymagany do skanowania paragonów i planowania posiłków. Klucz jest przechowywany tylko lokalnie w przeglądarce.
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); lsSet(LS_KEYS.apiKey, e.target.value); }}
              placeholder="sk-ant-..."
              className={`apikey-input ${darkMode ? "apikey-input-dark" : "apikey-input-light"}`}
              onFocus={e => e.target.style.borderColor = $.green}
              onBlur={e => e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0"}
            />
            <div className="apikey-actions">
              <button onClick={() => setShowKeyModal(false)}
                className="apikey-save">
                Zapisz
              </button>
            </div>
            {apiKey && <div className="apikey-status">Klucz ustawiony ({apiKey.slice(0,10)}...)</div>}
          </div>
        </div>
      )}

      {/* Skip link */}
      <a href="#main"
        className="skip-link"
      >Przejdź do treści</a>

      {/* ── TOP NAV ── */}
      <header>
        <nav className="topnav" aria-label="Nawigacja główna">
          {/* Logo */}
          <a href="#" className="topnav-logo" onClick={e => { e.preventDefault(); go("receipts"); }} aria-label="MaszkaApp — strona główna">
            <div className="topnav-logo-dot" aria-hidden="true" />
            MaszkaApp
          </a>

          {/* Desktop links */}
          <div className="topnav-items" role="list">
            {VIEWS.map(v => {
              const count = v.id === "receipts" ? receipts.length : v.id === "expenses" ? totalItems : 0;
              return (
                <div key={v.id} role="listitem">
                  <button
                    className={`topnav-btn${view === v.id ? " active" : ""}`}
                    onClick={() => go(v.id)}
                    aria-current={view === v.id ? "page" : undefined}
                  >
                    {v.label}
                    {count > 0 && (
                      <span className="topnav-badge" aria-label={`${count} elementów`}>
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Currency toggle */}
          <div className="cur-toggle" role="group" aria-label="Waluta">
            {["PLN","EUR","USD"].map(c => (
              <button key={c} className={`cur-btn${currency === c ? " active" : ""}`}
                onClick={() => setCurrency(c)} aria-pressed={currency === c}>{c}</button>
            ))}
          </div>

          {/* Add expense */}
          <button
            className="nav-add-btn"
            onClick={() => { setShowQA(true); haptic(12); }}
            aria-label="Dodaj wydatek">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
            Dodaj
          </button>

          {/* API Key */}
          <button className="dark-btn pos-relative" onClick={() => { setShowKeyModal(true); haptic(12); }}
            aria-label="Klucz API" title="Klucz API">
            🔑
            {!apiKey && <span className="key-dot" />}
          </button>

          {/* Dark mode */}
          <button className="dark-btn" onClick={() => { setDarkMode(d => !d); haptic(12); }}
            aria-label={darkMode ? "Tryb jasny" : "Tryb ciemny"} title={darkMode ? "Tryb jasny" : "Tryb ciemny"}>
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* Logout */}
          <button className="dark-btn" onClick={() => signOut(auth)}
            aria-label="Wyloguj" title="Wyloguj">
            🚪
          </button>

          {/* Mobile: centered title */}
          <span className="topnav-mobile-title" aria-hidden="true">{currentView?.label}</span>
        </nav>
      </header>

      {/* ── PAGE ── */}
      <main id="main" className="page" ref={pageRef}>
        {view === "receipts" && (
          <ReceiptsView
            receipts={receipts}
            setReceipts={setReceipts}
            processing={processing}
            errors={errors}
            setErrors={setErrors}
            onFiles={handleFiles}
          />
        )}
        {view === "home"      && <DashboardView receipts={receipts} expenses={expenses} budgets={budgets} recurring={recurring} currency={currency} go={go} allItems={allItems} />}
        {view === "expenses"  && <ExpensesView expenses={expenses} receipts={receipts} recurring={recurring} onDelete={id => setExpenses(e=>e.filter(x=>x.id!==id))} currency={currency} />}
        {view === "shopping"  && <ShoppingView receipts={receipts} />}
        {view === "stores"    && <StoresView receipts={receipts} expenses={expenses} />}
        {view === "budgets"   && <BudgetsView receipts={receipts} expenses={expenses} allItems={allItems} budgets={budgets} setBudgets={setBudgets} currency={currency} />}
        {view === "recurring" && <RecurringView recurring={recurring} setRecurring={setRecurring} currency={currency} />}
        {view === "stats"     && <StatsView receipts={receipts} expenses={expenses} allItems={allItems} currency={currency} />}
        {view === "inflation"  && <InflationView receipts={receipts} currency={currency} />}
        {view === "prediction" && <PredictionView receipts={receipts} currency={currency} />}
        {view === "mealplan"   && <MealPlanView receipts={receipts} apiKey={apiKey} />}
        {view === "export"     && <ExportView receipts={receipts} />}
      </main>

      {/* ── FAB ── */}
      <button className="fab" onClick={() => { setShowQA(true); haptic(12); }} aria-label="Dodaj wydatek">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2v18M2 11h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </button>

      {/* ── FLOATING PILL NAV (mobile) ── */}
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
    </>
  );
}
