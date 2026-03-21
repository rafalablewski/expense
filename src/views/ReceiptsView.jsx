import { useState, useMemo, useRef } from "react";
import Spinner from "../components/primitives/Spinner";
import DropZone from "../components/receipts/DropZone";
import ReceiptCard from "../components/receipts/ReceiptCard";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";
import { CATS, FX, FX_SYMBOLS, REC_CYCLES } from "../config/defaults";
import { isRecurringPaused, toMonthly, buildReceiptNumberMap } from "../utils/helpers";
import { haptic } from "../utils/helpers";

const TABS = [
  { id: "receipts",      label: "Paragony",    icon: "\uD83E\uDDFE" },
  { id: "subscriptions", label: "Subskrypcje", icon: "\uD83D\uDD04" },
  { id: "invoices",      label: "Faktury",     icon: "\uD83D\uDCC4" },
];

const REC_CATS = ["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Inne"];

export default function ReceiptsView({ onFiles, onManualEntry, onTextReceipt, onJsonImport, onSourceImport, onNeedKey }) {
  const {
    receipts, setReceipts, updateReceipt,
    recurring, setRecurring,
    processing, errors, setErrors,
    currency, apiKey,
  } = useAppData();

  const [tab, setTab] = useState("receipts");
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [showText, setShowText] = useState(false);
  const [textVal, setTextVal] = useState("");
  const [jsonDrag, setJsonDrag] = useState(false);
  const jsonFileRef = useRef();
  const sym = FX_SYMBOLS[currency] || "z\u0142";

  const receiptNumberMap = useMemo(() => buildReceiptNumberMap(receipts), [receipts]);

  // All receipts (scanned + manual) shown together in Paragony
  const allReceipts = useMemo(
    () => [...receipts].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [receipts]
  );

  // Receipts that look like invoices
  const invoiceReceipts = useMemo(
    () => receipts.filter(r => r.invoice_number || r.nip || r.is_invoice),
    [receipts]
  );

  // Counts for tab badges
  const counts = {
    receipts: allReceipts.length,
    subscriptions: recurring.length,
    invoices: invoiceReceipts.length,
  };

  // Edit handlers for subscriptions
  const startEditRecurring = (item) => setEditingRecurring({ ...item });
  const saveRecurring = () => {
    if (!editingRecurring.name?.trim() || !parseFloat(editingRecurring.amount)) return;
    setRecurring(r => r.map(x => x.id === editingRecurring.id
      ? { ...editingRecurring, amount: parseFloat(editingRecurring.amount) }
      : x
    ));
    setEditingRecurring(null);
  };
  const cancelEditRecurring = () => setEditingRecurring(null);

  const handleJsonFiles = (files) => {
    const jsonFiles = Array.from(files).filter(f =>
      f.name.endsWith(".json") || f.type === "application/json"
    );
    if (jsonFiles.length && onJsonImport) {
      haptic(20);
      onJsonImport(jsonFiles);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Twoje <span>dokumenty</span></h1>
          <p className="page-subtitle au1">Paragony, wydatki r\u0119czne, subskrypcje i faktury \u2014 wszystko w jednym miejscu</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-16">

          {/* Tab bar */}
          <div className="doc-tabs au" role="tablist" aria-label="Typ dokumentu">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`doc-tab${tab === t.id ? " doc-tab--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="doc-tab-icon">{t.icon}</span>
                <span className="doc-tab-label">{t.label}</span>
                {counts[t.id] > 0 && (
                  <span className="doc-tab-badge">{counts[t.id]}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── RECEIPTS TAB ── */}
          {tab === "receipts" && (
            <>
              {/* Input methods grid */}
              <div className="rv-input-grid au1">
                <div className="rv-input-main">
                  <DropZone onFiles={onFiles} />
                </div>
                <div className="rv-input-side">
                  <button className="rv-input-card" onClick={() => { haptic(15); onManualEntry(); }}>
                    <span className="rv-input-card-icon">✏️</span>
                    <span className="rv-input-card-label">Ręcznie</span>
                  </button>
                  <button className="rv-input-card" onClick={() => { haptic(15); setShowText(t => !t); }}>
                    <span className="rv-input-card-icon">💬</span>
                    <span className="rv-input-card-label">Tekst</span>
                  </button>
                  <button className="rv-input-card" onClick={() => { haptic(15); jsonFileRef.current?.click(); }}>
                    <span className="rv-input-card-icon">📂</span>
                    <span className="rv-input-card-label">JSON</span>
                    <input ref={jsonFileRef} type="file" accept=".json,application/json" multiple className="hidden"
                      onChange={e => handleJsonFiles(e.target.files)} />
                  </button>
                </div>
              </div>

              {/* Text input area (expandable) */}
              {showText && (
                <div className="rv-text-input au">
                  <textarea className="field text-receipt-area" value={textVal} onChange={e => setTextVal(e.target.value)}
                    placeholder={"Wklej tekst paragonu lub wpisz listę:\nmleko 2zł\nchleb razowy 5.50"}
                    autoFocus />
                  <button className="btn-primary" onClick={() => {
                      if (!textVal.trim()) return;
                      if (!apiKey) { onNeedKey(); return; }
                      haptic(20);
                      onTextReceipt(textVal.trim());
                      setTextVal("");
                      setShowText(false);
                    }}
                    disabled={!textVal.trim()}
                    style={{ width: "100%", justifyContent: "center", minHeight: 44, fontSize: 14, marginTop: 10, opacity: textVal.trim() ? 1 : 0.4 }}>
                    Analizuj z AI
                  </button>
                </div>
              )}

              {/* Source buttons */}
              <div className="rv-source-row au1">
                <span className="rv-source-row-label">Źródła:</span>
                <button className="rv-source-chip" onClick={() => {
                  haptic(15);
                  jsonFileRef.current?.setAttribute("data-source", "lidl");
                  jsonFileRef.current?.click();
                }}>
                  🟡 Lidl Plus
                </button>
                <button className="rv-source-chip" onClick={() => {
                  haptic(15);
                  jsonFileRef.current?.setAttribute("data-source", "biedronka");
                  jsonFileRef.current?.click();
                }}>
                  🐞 Biedronka
                </button>
              </div>

              <div className="flex-col gap-8">
                {processing.map(p => (
                  <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                    <Spinner />
                    <span>Analizuj\u0119 <strong>{p.name}</strong>\u2026</span>
                  </div>
                ))}
                {errors.map((err, i) => (
                  <div key={i} className="toast-err" role="alert">
                    <span>{err}</span>
                    <button onClick={() => setErrors(e => e.filter((_, j) => j !== i))} aria-label="Zamknij" className="btn-err-close">\u00D7</button>
                  </div>
                ))}
              </div>

              {allReceipts.length > 0 && (
                <div>
                  <div className="section-label">Paragony \u00B7 {allReceipts.length}</div>
                  <div className="flex-col gap-10">
                    {allReceipts.map((r, i) => (
                      <ReceiptCard
                        key={r.id} r={r} delay={i * 0.05}
                        receiptNumber={receiptNumberMap.get(r.id)}
                        onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                        onUpdate={updateReceipt}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!allReceipts.length && !processing.length && (
                <Empty icon="\uD83E\uDDFE" title="Brak paragon\u00F3w" sub="Dodaj pierwszy paragon \u2014 przeci\u0105gnij zdj\u0119cie, wklej tekst lub importuj JSON" />
              )}
            </>
          )}

          {/* ── SUBSCRIPTIONS TAB ── */}
          {tab === "subscriptions" && (
            <>
              {recurring.length > 0 ? (
                <div>
                  <div className="section-label">
                    Aktywne subskrypcje \u00B7 {recurring.filter(r => !isRecurringPaused(r)).length} z {recurring.length}
                  </div>
                  <div className="flex-col gap-8">
                    {recurring.map((item, i) => {
                      const isEditing = editingRecurring?.id === item.id;
                      const monthly = toMonthly(item) * (FX[currency] || 1);
                      const catCol = CATS[item.category] || "#9CA3AF";
                      const dispAmt = (parseFloat(item.amount) * (FX[currency] || 1)).toFixed(2);
                      const paused = isRecurringPaused(item);

                      if (isEditing) {
                        return (
                          <div key={item.id} className="card card--p22 au" style={{ animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) both` }}>
                            <div className="section-heading mb-14">Edytuj subskrypcj\u0119</div>
                            <div className="flex-col gap-12">
                              <div className="flex-row flex-wrap gap-10">
                                <div className="form-group-lg min-w-160">
                                  <label className="field-label-sm">Nazwa</label>
                                  <input className="field" value={editingRecurring.name}
                                    onChange={e => setEditingRecurring(s => ({ ...s, name: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && saveRecurring()} />
                                </div>
                                <div className="form-group min-w-100">
                                  <label className="field-label-sm">Kwota (PLN)</label>
                                  <input className="field" type="number" inputMode="decimal" min="0" step="0.01"
                                    value={editingRecurring.amount}
                                    onChange={e => setEditingRecurring(s => ({ ...s, amount: e.target.value }))} />
                                </div>
                              </div>
                              <div>
                                <div className="field-label-sm mb-8">Cykl</div>
                                <div className="pills-row" role="group" aria-label="Cykl p\u0142atno\u015Bci">
                                  {REC_CYCLES.map(c => (
                                    <button key={c} className={`pill${editingRecurring.cycle === c ? " on" : ""}`}
                                      onClick={() => setEditingRecurring(s => ({ ...s, cycle: c }))}
                                      aria-pressed={editingRecurring.cycle === c}>{c}</button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="field-label-sm mb-8">Kategoria</div>
                                <div className="pills-row" role="group" aria-label="Kategoria">
                                  {REC_CATS.map(c => (
                                    <button key={c} className={`pill${editingRecurring.category === c ? " on" : ""}`}
                                      onClick={() => setEditingRecurring(s => ({ ...s, category: c }))}
                                      aria-pressed={editingRecurring.category === c}>{c}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex-row gap-10">
                                <button className="btn-primary" onClick={saveRecurring}>Zapisz</button>
                                <button className="btn-secondary" onClick={cancelEditRecurring}>Anuluj</button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className={`doc-item card${paused ? " doc-item--paused" : ""}`}
                          style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * 0.04}s both` }}
                        >
                          <div className="icon-circle icon-circle--42" style={{ background: catCol + "18", border: `1px solid ${catCol}30` }}>
                            {item.category === "Subskrypcje" ? "\uD83D\uDCF1" : item.category === "Zdrowie" ? "\uD83D\uDCAA" : item.category === "Dom" ? "\uD83C\uDFE0" : item.category === "Transport" ? "\uD83D\uDE97" : item.category === "Rozrywka" ? "\uD83C\uDFAC" : "\uD83D\uDD04"}
                          </div>
                          <div className="flex-1">
                            <div className="item-title-lg">{item.name}</div>
                            <div className="flex-row flex-wrap gap-8" style={{ marginTop: 4 }}>
                              <CatChip cat={item.category} />
                              <span className="rec-badge" style={{ background: catCol + "15", color: catCol, border: `1px solid ${catCol}25` }}>
                                \uD83D\uDD04 {item.cycle}
                              </span>
                              {item.cycle !== "Miesi\u0119cznie" && (
                                <span className="item-sub-sm">\u2248 {monthly.toFixed(2)} {sym}/mies.</span>
                              )}
                              {paused && (
                                <span className="paused-badge">
                                  \u23F8 Wstrzymany{item.pauseUntil ? ` do ${item.pauseUntil}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="mono store-total-val" style={{ fontSize: 18, color: catCol }}>
                              {dispAmt}
                            </div>
                            <div className="item-sub-sm">{sym} / {item.cycle.toLowerCase()}</div>
                          </div>
                          <button
                            onClick={() => startEditRecurring(item)}
                            className="btn-icon-sm"
                            aria-label={`Edytuj ${item.name}`}
                          >\u270E</button>
                          <button
                            onClick={() => setRecurring(r => r.filter(x => x.id !== item.id))}
                            className="btn-icon-sm danger"
                            aria-label={`Usu\u0144 ${item.name}`}
                          >\u00D7</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Empty icon="\uD83D\uDD04" title="Brak subskrypcji" sub="Dodaj subskrypcje w zak\u0142adce Cykliczne wydatki" />
              )}
            </>
          )}

          {/* ── INVOICES TAB ── */}
          {tab === "invoices" && (
            <>
              <div className="au1"><DropZone onFiles={onFiles} title="Skanuj fakturę" subtitle="Przeciągnij zdjęcie faktury tutaj" icon="📄" /></div>

              <div className="flex-col gap-8">
                {processing.map(p => (
                  <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                    <Spinner />
                    <span>Analizuj\u0119 <strong>{p.name}</strong>\u2026</span>
                  </div>
                ))}
              </div>

              {invoiceReceipts.length > 0 ? (
                <div>
                  <div className="section-label">Faktury \u00B7 {invoiceReceipts.length}</div>
                  <div className="flex-col gap-10">
                    {invoiceReceipts.map((r, i) => (
                      <ReceiptCard
                        key={r.id} r={r} delay={i * 0.05}
                        receiptNumber={receiptNumberMap.get(r.id)}
                        onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                        onUpdate={updateReceipt}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Empty icon="\uD83D\uDCC4" title="Brak faktur" sub="Zeskanuj faktur\u0119 \u2014 przeci\u0105gnij zdj\u0119cie lub kliknij powy\u017Cej" />
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
