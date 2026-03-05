import { useState } from "react";
import $ from "../config/theme";
import { CATS, FX, FX_SYMBOLS } from "../config/defaults";
import { isRecurringPaused, toMonthly } from "../utils/helpers";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

const REC_CYCLES = ["Miesięcznie","Tygodniowo","Rocznie","Kwartalnie"];

export default function RecurringView() {
  const { recurring, setRecurring, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [form, setForm]   = useState({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.name.trim() || !parseFloat(form.amount)) return;
    setRecurring(r => [...r, { ...form, id: Date.now(), amount: parseFloat(form.amount) }]);
    setForm({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
    setAdding(false);
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
                  <div key={item.id} className={`recurring-item${paused ? " recurring-item--paused" : ""}`} style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both` }}>
                    {/* Icon */}
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
