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
  { id: "receipts",      label: "Paragony",    icon: "🧾" },
  { id: "manual",        label: "Ręczne",      icon: "✏️" },
  { id: "subscriptions", label: "Subskrypcje", icon: "🔄" },
  { id: "invoices",      label: "Faktury",     icon: "📄" },
];

export default function ReceiptsView({ onFiles }) {
  const {
    receipts, setReceipts, updateReceipt,
    expenses, deleteExpense,
    recurring, setRecurring,
    processing, errors, setErrors,
    currency,
  } = useAppData();

  const [tab, setTab] = useState("receipts");
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

  // Receipts that look like invoices (have address/store info suggesting business)
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
                      const catCol = CATS[exp.category] || "#9CA3AF";
                      const dispAmt = (parseFloat(exp.amount) * (FX[currency] || 1)).toFixed(2);
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
                            </div>
                            {exp.note && <div className="item-sub-sm" style={{ marginTop: 4, fontStyle: "italic" }}>{exp.note}</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="mono store-total-val" style={{ fontSize: 18, color: catCol }}>
                              {dispAmt}
                            </div>
                            <div className="item-sub-sm">{sym}</div>
                          </div>
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
                      const monthly = toMonthly(item) * (FX[currency] || 1);
                      const catCol = CATS[item.category] || "#9CA3AF";
                      const dispAmt = (parseFloat(item.amount) * (FX[currency] || 1)).toFixed(2);
                      const paused = isRecurringPaused(item);
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
