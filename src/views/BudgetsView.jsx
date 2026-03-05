import { useMemo, useState } from "react";
import $ from "../config/theme";
import { CATS, FX_SYMBOLS } from "../config/defaults";
import { convertAmt, parseDate } from "../utils/helpers";
import { useAppData } from "../contexts/AppDataContext";

export default function BudgetsView() {
  const { receipts, expenses, allItems, budgets, setBudgets, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [editing, setEditing] = useState(null); // cat being edited
  const [editVal, setEditVal] = useState("");
  const [expanded, setExpanded] = useState({}); // { cat: true/false }

  const toggleExpand = (cat) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  // Current month spending per category
  const now = new Date();
  const monthItems = useMemo(() =>
    receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return [];
      return (r.items || []).map(it => ({ ...it, store: r.store, date: r.date }));
    }),
    [receipts]
  );

  const spending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => {
      const cat = it.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(it.total_price) || 0);
    });
    return map;
  }, [monthItems]);

  // Items grouped by category
  const itemsByCat = useMemo(() => {
    const map = {};
    monthItems.forEach(it => {
      const cat = it.category || "Inne";
      if (!map[cat]) map[cat] = [];
      map[cat].push(it);
    });
    // Sort each category's items by price descending
    Object.values(map).forEach(arr => arr.sort((a, b) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0)));
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
              const isExpanded = expanded[cat];
              const items = itemsByCat[cat] || [];
              const hasItems = items.length > 0;

              return (
                <div key={cat} style={{ borderBottom: i < allCats.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none" }}>
                  <div className={`budget-row${over ? " budget-row--over" : ""}`}>
                    {/* Expand toggle */}
                    <button
                      className={`budget-expand-btn${isExpanded ? " open" : ""}`}
                      onClick={() => hasItems && toggleExpand(cat)}
                      disabled={!hasItems}
                      aria-label={isExpanded ? `Zwiń ${cat}` : `Rozwiń ${cat}`}
                      aria-expanded={isExpanded}
                    >
                      {hasItems ? "▸" : " "}
                    </button>

                    {/* Dot */}
                    <div className="legend-dot" style={{ background: catCol }} />

                    {/* Cat name */}
                    <div
                      className="budget-cat-name"
                      onClick={() => hasItems && toggleExpand(cat)}
                      style={{ cursor: hasItems ? "pointer" : "default" }}
                    >
                      {cat}
                      {hasItems && <span className="budget-item-count">{items.length}</span>}
                    </div>

                    {/* Bar + amounts */}
                    <div className="flex-1">
                      {budget > 0 ? (
                        <>
                          <div className="flex-between mb-5">
                            <span className="mono fs-12" style={{ color: over ? $.red : $.ink2, fontWeight: over ? 700 : 400 }}>
                              {convertAmt(spent, currency)} {sym}
                            </span>
                            <span className="mono fs-12 color-ink3">
                              / {convertAmt(budget, currency)} {sym}
                            </span>
                          </div>
                          <div className="budget-bar-track">
                            <div className="budget-bar-fill" style={{ width: `${pct}%`, background: over ? $.red : pct > 80 ? $.amber : catCol }} />
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

                  {/* Expanded product list */}
                  {isExpanded && hasItems && (
                    <div className="budget-items-list">
                      {items.map((item, j) => (
                        <div key={j} className="budget-item-row">
                          <span className="budget-item-name">{item.name || "—"}</span>
                          {item.store && <span className="budget-item-store">{item.store}</span>}
                          <span className="budget-item-price mono">
                            {convertAmt(parseFloat(item.total_price) || 0, currency)} {sym}
                          </span>
                        </div>
                      ))}
                    </div>
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
