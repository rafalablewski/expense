import { useState } from "react";
import $ from "../config/theme";
import { CATS, FX, FX_SYMBOLS, REC_CYCLES } from "../config/defaults";
import { isRecurringPaused, toMonthly } from "../utils/helpers";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

const EDIT_CATS = ["Subskrypcje","Zdrowie","Dom","Rozrywka","Transport","Paliwo","Sport","Edukacja","Elektronika","Inne"];

export default function RecurringView() {
  const { recurring, setRecurring, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [form, setForm]   = useState({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const add = () => {
    if (!form.name.trim() || !parseFloat(form.amount)) return;
    setRecurring(r => [...r, { ...form, id: Date.now(), amount: parseFloat(form.amount) }]);
    setForm({ name: "", amount: "", cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
    setAdding(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, amount: String(item.amount), cycle: item.cycle, category: item.category || "Subskrypcje" });
    setPauseMenu(null);
  };

  const saveEdit = (item) => {
    if (!editForm.name.trim() || !parseFloat(editForm.amount)) return;
    const newAmount = parseFloat(editForm.amount);
    const oldAmount = parseFloat(item.amount);
    const amountChanged = Math.abs(newAmount - oldAmount) > 0.001;

    setRecurring(r => r.map(it => {
      if (it.id !== item.id) return it;
      const updated = { ...it, name: editForm.name.trim(), cycle: editForm.cycle, category: editForm.category };
      if (amountChanged) {
        // Record old amount in history so past charges keep the old price
        const history = it.amountHistory || [];
        history.push({ amount: oldAmount, until: new Date().toISOString().slice(0, 10) });
        updated.amount = newAmount;
        updated.amountHistory = history;
      }
      return updated;
    }));
    setEditingId(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
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
                    <input id="ramt" className="field" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="29.99" />
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
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <div key={item.id} className="recurring-item" style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both`, flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                      <div className="flex-row flex-wrap gap-10">
                        <div className="form-group-lg min-w-160">
                          <label className="field-label-sm">Nazwa</label>
                          <input className="field" value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                            onKeyDown={e => e.key === "Enter" && saveEdit(item)} autoFocus />
                        </div>
                        <div className="form-group min-w-100">
                          <label className="field-label-sm">Kwota (PLN)</label>
                          <input className="field" type="number" inputMode="decimal" min="0" step="0.01" value={editForm.amount}
                            onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} />
                        </div>
                      </div>
                      {parseFloat(editForm.amount) !== parseFloat(item.amount) && parseFloat(editForm.amount) > 0 && (
                        <div className="item-sub-sm" style={{ color: "#D97706" }}>
                          Zmiana kwoty nie wpłynie na poprzednie obciążenia
                        </div>
                      )}
                      <div className="flex-row flex-wrap gap-10">
                        <div className="form-group min-w-140">
                          <div className="field-label-sm mb-8">Cykl</div>
                          <div className="pills-row" role="group" aria-label="Cykl płatności">
                            {REC_CYCLES.map(c => (
                              <button key={c} className={`pill${editForm.cycle === c ? " on" : ""}`} onClick={() => setEditForm(f => ({...f, cycle: c}))} aria-pressed={editForm.cycle === c}>{c}</button>
                            ))}
                          </div>
                        </div>
                        <div className="form-group min-w-140">
                          <div className="field-label-sm mb-8">Kategoria</div>
                          <div className="pills-row" role="group" aria-label="Kategoria">
                            {EDIT_CATS.map(c => (
                              <button key={c} className={`pill${editForm.category === c ? " on" : ""}`} onClick={() => setEditForm(f => ({...f, category: c}))} aria-pressed={editForm.category === c}>{c}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex-row gap-8">
                        <button className="btn-primary" onClick={() => saveEdit(item)} style={{ flex: 1 }}>Zapisz</button>
                        <button className="toggle-btn" onClick={cancelEdit}>Anuluj</button>
                      </div>
                    </div>
                  );
                }

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

                    {/* Edit button */}
                    <button onClick={() => startEdit(item)}
                      className="btn-icon-sm" style={{ color: $.ink3 }}
                      aria-label={`Edytuj ${item.name}`}>
                      ✏️
                    </button>

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
