import { useState, useMemo } from "react";
import Spinner from "../components/primitives/Spinner";
import DropZone from "../components/receipts/DropZone";
import ReceiptCard from "../components/receipts/ReceiptCard";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import StorePickerInput from "../components/primitives/StorePickerInput";
import { useAppData } from "../contexts/AppDataContext";
import { CATS, ALL_CATS, FX, FX_SYMBOLS } from "../config/defaults";
import { isRecurringPaused } from "../utils/helpers";

const TABS = [
  { id: "receipts",      label: "Paragony",    icon: "🧾" },
  { id: "manual",        label: "Ręczne",      icon: "✏️" },
  { id: "subscriptions", label: "Subskrypcje", icon: "🔄" },
  { id: "invoices",      label: "Faktury",     icon: "📄" },
];

const REC_CYCLES = ["Miesięcznie","Tygodniowo","Rocznie","Kwartalnie"];
const REC_CATS = ["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Inne"];

export default function ReceiptsView({ onFiles }) {
  const {
    receipts, setReceipts, updateReceipt,
    expenses, updateExpense, deleteExpense,
    recurring, setRecurring,
    processing, errors, setErrors,
    currency,
    customStores, addCustomStore,
  } = useAppData();

  const [tab, setTab] = useState("receipts");
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const sym = FX_SYMBOLS[currency] || "zł";

  // Manual expenses sorted by date desc
  const manualExpenses = useMemo(
    () => [...expenses].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [expenses]
  );

  // Subscriptions with monthly cost
  const toMonthly = (item) => {
    const a = parseFloat(item.amount) || 0;
    const base = { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 };
    return base[item.cycle] || a;
  };

  // Receipts that look like invoices
  const invoiceReceipts = useMemo(
    () => receipts.filter(r => r.invoice_number || r.nip || r.is_invoice),
    [receipts]
  );

  // Counts for tab badges
  const counts = {
    receipts: receipts.length,
    manual: manualExpenses.length,
    subscriptions: recurring.length,
    invoices: invoiceReceipts.length,
  };

  // ── Edit handlers for manual expenses ──
  const startEditExpense = (exp) => setEditingExpense({ ...exp });
  const saveExpense = () => {
    if (!editingExpense.name?.trim() || !parseFloat(editingExpense.amount)) return;
    updateExpense({
      ...editingExpense,
      amount: parseFloat(editingExpense.amount),
      total_price: parseFloat(editingExpense.amount),
      quantity: parseFloat(editingExpense.quantity) || 1,
      unit: editingExpense.unit?.trim() || null,
      unit_price: parseFloat(editingExpense.unit_price) || null,
      discount: parseFloat(editingExpense.discount) || null,
      discount_label: editingExpense.discount_label?.trim() || null,
      city: editingExpense.city?.trim() || null,
    });
    setEditingExpense(null);
  };
  const cancelEditExpense = () => setEditingExpense(null);

  // ── Edit handlers for subscriptions ──
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
          <p className="page-subtitle au1">Paragony, wydatki ręczne, subskrypcje i faktury — wszystko w jednym miejscu</p>
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
                        onUpdate={updateReceipt}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!receipts.length && !processing.length && (
                <Empty icon="🧾" title="Brak paragonów" sub="Dodaj pierwszy paragon — przeciągnij zdjęcie lub kliknij powyżej" />
              )}
            </>
          )}

          {/* ── MANUAL EXPENSES TAB ── */}
          {tab === "manual" && (
            <>
              {manualExpenses.length > 0 ? (
                <div>
                  <div className="section-label">Dodane ręcznie · {manualExpenses.length}</div>
                  <div className="flex-col gap-8">
                    {manualExpenses.map((exp, i) => {
                      const isEditing = editingExpense?.id === exp.id;
                      const catCol = CATS[exp.category] || "#9CA3AF";
                      const dispAmt = (parseFloat(exp.amount) * (FX[currency] || 1)).toFixed(2);

                      if (isEditing) {
                        return (
                          <div key={exp.id} className="card card--p22 au" style={{ animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) both` }}>
                            <div className="section-heading mb-14">Edytuj wydatek</div>
                            <div className="flex-col gap-12">
                              {/* Name */}
                              <div className="form-group-lg">
                                <label className="field-label-sm">Nazwa</label>
                                <input className="field" value={editingExpense.name}
                                  onChange={e => setEditingExpense(s => ({ ...s, name: e.target.value }))}
                                  onKeyDown={e => e.key === "Enter" && saveExpense()} />
                              </div>

                              {/* Quantity + Unit + Unit Price row */}
                              <div className="flex-row flex-wrap gap-10">
                                <div className="form-group min-w-70">
                                  <label className="field-label-sm">Ilość</label>
                                  <input className="field text-right" type="number" min="0" step="0.01"
                                    value={editingExpense.quantity ?? 1}
                                    onChange={e => setEditingExpense(s => ({ ...s, quantity: e.target.value }))}
                                    placeholder="1" />
                                </div>
                                <div className="form-group min-w-60">
                                  <label className="field-label-sm">Jedn.</label>
                                  <input className="field" value={editingExpense.unit || ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, unit: e.target.value }))}
                                    placeholder="szt, kg, l…" />
                                </div>
                                <div className="form-group min-w-90">
                                  <label className="field-label-sm">Cena jedn.</label>
                                  <input className="field text-right" type="number" min="0" step="0.01"
                                    value={editingExpense.unit_price ?? ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, unit_price: e.target.value }))}
                                    placeholder="0.00" />
                                </div>
                              </div>

                              {/* Discount + Discount Label + Total row */}
                              <div className="flex-row flex-wrap gap-10">
                                <div className="form-group min-w-80">
                                  <label className="field-label-sm">Zniżka (zł)</label>
                                  <input className="field text-right" type="number" min="0" step="0.01"
                                    value={editingExpense.discount ?? ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, discount: e.target.value }))}
                                    placeholder="0.00" />
                                </div>
                                <div className="form-group min-w-80">
                                  <label className="field-label-sm">Opis zniżki</label>
                                  <input className="field" value={editingExpense.discount_label || ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, discount_label: e.target.value }))}
                                    placeholder="np. Karta Moja" />
                                </div>
                                <div className="form-group min-w-90">
                                  <label className="field-label-sm">Razem (PLN)</label>
                                  <input className="field text-right" type="number" min="0" step="0.01"
                                    value={editingExpense.amount}
                                    onChange={e => setEditingExpense(s => ({ ...s, amount: e.target.value }))} />
                                </div>
                              </div>

                              {/* Category */}
                              <div>
                                <div className="field-label-sm mb-8">Kategoria</div>
                                <div className="pills-row" role="group" aria-label="Kategoria">
                                  {ALL_CATS.map(c => (
                                    <button key={c} className={`pill pill--sm${editingExpense.category === c ? " on" : ""}`}
                                      onClick={() => setEditingExpense(s => ({ ...s, category: c }))}
                                      aria-pressed={editingExpense.category === c}>{c}</button>
                                  ))}
                                </div>
                              </div>

                              {/* Date + Store + City row */}
                              <div className="flex-row flex-wrap gap-10">
                                <div className="form-group min-w-120">
                                  <label className="field-label-sm">Data</label>
                                  <input className="field" type="date" value={editingExpense.date || ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, date: e.target.value }))} />
                                </div>
                                <div className="form-group min-w-120">
                                  <label className="field-label-sm">Sklep / źródło</label>
                                  <StorePickerInput value={editingExpense.store || ""} onChange={v => setEditingExpense(s => ({ ...s, store: v }))}
                                    customStores={customStores} onAddCustomStore={addCustomStore} placeholder="np. Biedronka" />
                                </div>
                                <div className="form-group min-w-90">
                                  <label className="field-label-sm">Miasto</label>
                                  <input className="field" value={editingExpense.city || ""}
                                    onChange={e => setEditingExpense(s => ({ ...s, city: e.target.value }))}
                                    placeholder="np. Katowice" />
                                </div>
                              </div>

                              {/* Note */}
                              <div>
                                <label className="field-label-sm">Notatka</label>
                                <input className="field" value={editingExpense.note || ""}
                                  onChange={e => setEditingExpense(s => ({ ...s, note: e.target.value }))}
                                  placeholder="Opcjonalnie" />
                              </div>

                              <div className="flex-row gap-10">
                                <button className="btn-primary" onClick={saveExpense}>Zapisz</button>
                                <button className="btn-secondary" onClick={cancelEditExpense}>Anuluj</button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={exp.id}
                          className="doc-item card"
                          style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * 0.04}s both` }}
                        >
                          <div className="icon-circle icon-circle--42" style={{ background: catCol + "18", border: `1px solid ${catCol}30` }}>
                            ✏️
                          </div>
                          <div className="flex-1">
                            <div className="item-title-lg">{exp.name}</div>
                            <div className="flex-row flex-wrap gap-8" style={{ marginTop: 4 }}>
                              <CatChip cat={exp.category} />
                              {exp.date && <span className="item-sub-sm">{exp.date}</span>}
                              {exp.store && <span className="item-sub-sm">{exp.store}</span>}
                              {exp.city && <span className="item-sub-sm">{exp.city}</span>}
                            </div>
                            {(exp.quantity > 1 || exp.unit || exp.discount) && (
                              <div className="flex-row flex-wrap gap-8" style={{ marginTop: 4 }}>
                                {(exp.quantity > 1 || exp.unit) && (
                                  <span className="item-sub-sm">{exp.quantity ?? 1}{exp.unit ? ` ${exp.unit}` : ""}{exp.unit_price ? ` × ${exp.unit_price.toFixed(2)}` : ""}</span>
                                )}
                                {exp.discount > 0 && (
                                  <span className="item-sub-sm" style={{ color: "#16a34a" }}>
                                    -{parseFloat(exp.discount).toFixed(2)}{exp.discount_label ? ` (${exp.discount_label})` : ""}
                                  </span>
                                )}
                              </div>
                            )}
                            {exp.note && <div className="item-sub-sm" style={{ marginTop: 4, fontStyle: "italic" }}>{exp.note}</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="mono store-total-val" style={{ fontSize: 18, color: catCol }}>
                              {dispAmt}
                            </div>
                            <div className="item-sub-sm">{sym}</div>
                          </div>
                          <button
                            onClick={() => startEditExpense(exp)}
                            className="btn-icon-sm"
                            aria-label={`Edytuj ${exp.name}`}
                          >✎</button>
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="btn-icon-sm danger"
                            aria-label={`Usuń ${exp.name}`}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Empty icon="✏️" title="Brak ręcznych wydatków" sub="Dodaj wydatek za pomocą przycisku + na dole ekranu" />
              )}
            </>
          )}

          {/* ── SUBSCRIPTIONS TAB ── */}
          {tab === "subscriptions" && (
            <>
              {recurring.length > 0 ? (
                <div>
                  <div className="section-label">
                    Aktywne subskrypcje · {recurring.filter(r => !isRecurringPaused(r)).length} z {recurring.length}
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
                            <div className="section-heading mb-14">Edytuj subskrypcję</div>
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
                                <div className="pills-row" role="group" aria-label="Cykl płatności">
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
                            <div className="mono store-total-val" style={{ fontSize: 18, color: catCol }}>
                              {dispAmt}
                            </div>
                            <div className="item-sub-sm">{sym} / {item.cycle.toLowerCase()}</div>
                          </div>
                          <button
                            onClick={() => startEditRecurring(item)}
                            className="btn-icon-sm"
                            aria-label={`Edytuj ${item.name}`}
                          >✎</button>
                          <button
                            onClick={() => setRecurring(r => r.filter(x => x.id !== item.id))}
                            className="btn-icon-sm danger"
                            aria-label={`Usuń ${item.name}`}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Empty icon="🔄" title="Brak subskrypcji" sub="Dodaj subskrypcje w zakładce Cykliczne wydatki" />
              )}
            </>
          )}

          {/* ── INVOICES TAB ── */}
          {tab === "invoices" && (
            <>
              <div className="au1"><DropZone onFiles={onFiles} /></div>

              <div className="flex-col gap-8">
                {processing.map(p => (
                  <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                    <Spinner />
                    <span>Analizuję <strong>{p.name}</strong>…</span>
                  </div>
                ))}
              </div>

              {invoiceReceipts.length > 0 ? (
                <div>
                  <div className="section-label">Faktury · {invoiceReceipts.length}</div>
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
                <Empty icon="📄" title="Brak faktur" sub="Zeskanuj fakturę — przeciągnij zdjęcie lub kliknij powyżej" />
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
