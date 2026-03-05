import { useState, useMemo } from "react";
import Spinner from "../components/primitives/Spinner";
import DropZone from "../components/receipts/DropZone";
import ReceiptCard from "../components/receipts/ReceiptCard";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";
import { CATS, FX, FX_SYMBOLS } from "../config/defaults";
import { isRecurringPaused } from "../utils/helpers";

const TABS = [
  { id: "receipts",      label: "Paragony",    icon: "\uD83E\uDDFE" },
  { id: "subscriptions", label: "Subskrypcje", icon: "\uD83D\uDD04" },
  { id: "invoices",      label: "Faktury",     icon: "\uD83D\uDCC4" },
];

const REC_CYCLES = ["Miesi\u0119cznie","Tygodniowo","Rocznie","Kwartalnie"];
const REC_CATS = ["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Inne"];

export default function ReceiptsView({ onFiles }) {
  const {
    receipts, setReceipts, updateReceipt,
    recurring, setRecurring,
    processing, errors, setErrors,
    currency,
  } = useAppData();

  const [tab, setTab] = useState("receipts");
  const [editingRecurring, setEditingRecurring] = useState(null);
  const sym = FX_SYMBOLS[currency] || "z\u0142";

  // All receipts (scanned + manual) shown together in Paragony
  const allReceipts = useMemo(
    () => [...receipts].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [receipts]
  );

  // Subscriptions with monthly cost
  const toMonthly = (item) => {
    const a = parseFloat(item.amount) || 0;
    const base = { "Miesi\u0119cznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 };
    return base[item.cycle] || a;
  };

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

  // \u2500\u2500 Edit handlers for subscriptions \u2500\u2500
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

          {/* \u2500\u2500 RECEIPTS TAB \u2500\u2500 */}
          {tab === "receipts" && (
            <>
              <div className="au1"><DropZone onFiles={onFiles} /></div>

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
                        onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                        onUpdate={updateReceipt}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!allReceipts.length && !processing.length && (
                <Empty icon="\uD83E\uDDFE" title="Brak paragon\u00F3w" sub="Dodaj pierwszy paragon \u2014 przeci\u0105gnij zdj\u0119cie lub kliknij powy\u017Cej" />
              )}
            </>
          )}

          {/* \u2500\u2500 SUBSCRIPTIONS TAB \u2500\u2500 */}
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
                                  <input className="field" type="number" min="0" step="0.01"
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

          {/* \u2500\u2500 INVOICES TAB \u2500\u2500 */}
          {tab === "invoices" && (
            <>
              <div className="au1"><DropZone onFiles={onFiles} /></div>

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
