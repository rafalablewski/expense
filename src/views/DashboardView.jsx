import { useMemo, useState } from "react";
import $ from "../config/theme";
import { FX_SYMBOLS } from "../config/defaults";
import { convertAmt, isRecurringPaused, parseDate, receiptSavings, sumReceiptItems, toMonthly } from "../utils/helpers";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

export default function DashboardView({ go }) {
  const { receipts, budgets, recurring, currency, allItems } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const now = new Date();
  const [includeRecurring, setIncludeRecurring] = useState(true);

  // This month — receipts (includes both scanned and manual)
  const thisMonth = useMemo(() => receipts.filter(r => {
    const d = parseDate(r.date);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [receipts]);

  const monthSpent = thisMonth.reduce((s, r) => s + sumReceiptItems(r), 0);
  const totalSpent = receipts.reduce((s, r) => s + sumReceiptItems(r), 0);
  const totalSaved = receipts.reduce((s, r) => s + receiptSavings(r), 0);

  // Budget alerts
  const monthItems = useMemo(() =>
    thisMonth.flatMap(r => r.items || []),
    [thisMonth]
  );
  const monthSpending = useMemo(() => {
    const map = {};
    monthItems.forEach(it => { const c = it.category || "Inne"; map[c] = (map[c] || 0) + (parseFloat(it.total_price) || 0); });
    return map;
  }, [monthItems]);
  const alerts = Object.entries(budgets)
    .filter(([cat, bgt]) => monthSpending[cat] > bgt * 0.8)
    .map(([cat, bgt]) => ({ cat, spent: monthSpending[cat] || 0, budget: bgt, over: monthSpending[cat] > bgt }));

  // Monthly recurring total
  const recurringMonthly = recurring.filter(r => !isRecurringPaused(r)).reduce((s, r) => s + toMonthly(r), 0);

  // Filter allItems: exclude legacy expenses (duplicates of receipt data), optionally exclude recurring
  const filteredItems = useMemo(
    () => allItems.filter(it =>
      includeRecurring || it.source !== "recurring"
    ),
    [allItems, includeRecurring]
  );

  // Duplicates: items bought in 2+ stores, find price variance
  const duplicates = useMemo(() => {
    const nameMap = {};
    filteredItems.forEach(it => {
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
  }, [filteredItems]);

  // Top 3 most expensive items (reactive — recalculates on every receipt change)
  const top3Items = useMemo(() =>
    [...filteredItems].sort((a, b) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0)).slice(0, 3),
    [filteredItems]
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
            {receipts.length ? `${receipts.length} paragonów · ${filteredItems.length} pozycji` : "Dodaj pierwszy paragon aby zacząć"}
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
              <div className="widget-big color-green">
                {convertAmt(monthSpent + (includeRecurring ? recurringMonthly : 0), currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                paragony{includeRecurring ? " + subskrypcje" : ""} · {monthName}
              </div>
              <button onClick={() => go("stats")} className="btn-link mt-12">
                Zobacz statystyki →
              </button>
            </div>

            {/* Just receipts */}
            <div className="widget">
              <div className="widget-label">Paragony</div>
              <div className="widget-big color-ink0">
                {convertAmt(monthSpent, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                {thisMonth.length} paragonów · {monthName}
              </div>
              <button onClick={() => go("receipts")} className="btn-link mt-12">
                Wszystkie paragony →
              </button>
            </div>

            {/* Just subscriptions */}
            <div className="widget">
              <div className="widget-label">Subskrypcje</div>
              <div className="widget-big color-ink0">
                {convertAmt(recurringMonthly, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                {recurring.length} aktywnych subskrypcji
              </div>
              <button onClick={() => go("recurring")} className="btn-link mt-12">
                Zarządzaj →
              </button>
            </div>

            {/* Savings */}
            <div className="widget">
              <div className="widget-label">Zaoszczędzono</div>
              <div className="widget-big color-red">
                {convertAmt(totalSaved, currency)}
                <span className="widget-unit">{sym}</span>
              </div>
              <div className="widget-desc">
                dzięki rabatom, promocjom lub darmowej dostawie
              </div>
            </div>
          </div>

          {/* ── Recurring toggle ── */}
          {recurring.length > 0 && (
            <button
              onClick={() => setIncludeRecurring(v => !v)}
              className={`stats-recurring-btn${includeRecurring ? " active" : ""}`}
              aria-pressed={includeRecurring}
            >
              {includeRecurring
                ? `🔄 Subskrypcje wliczone: +${convertAmt(recurringMonthly, currency)} ${sym}/mies.`
                : "🔄 Subskrypcje wyłączone — kliknij aby wliczyć"
              }
            </button>
          )}

          {/* ── Budget alerts ── */}
          {alerts.length > 0 && (
            <div className="au1">
              <div className="section-heading">Alerty budżetowe</div>
              <div className="flex-col gap-8">
                {alerts.map(a => (
                  <div key={a.cat} className={`alert-card${a.over ? " alert-card--over" : " alert-card--warn"}`}>
                    <span className="alert-icon">{a.over ? "🔴" : "🟡"}</span>
                    <div className="flex-1">
                      <div className="alert-title" style={{ color: a.over ? $.red : $.amber }}>
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
                  <div key={d.name} className="glass-card--p-row flex-row gap-14" style={{ borderBottom: i < duplicates.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none" }}>
                    <div className="icon-box icon-box-36" style={{ background: $.greenBg, border: `1px solid ${$.greenRim}` }}>💡</div>
                    <div className="flex-1">
                      <div className="item-title">{d.name}</div>
                      <div className="item-sub">
                        Cena od <span className="mono">{convertAmt(d.minP, currency)} {sym}</span> do <span className="mono">{convertAmt(d.maxP, currency)} {sym}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="mono fs-15 fw-700 color-green">
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
                  <div key={i} className="glass-card--p-row flex-row gap-14" style={{ borderBottom: i < top3Items.length - 1 ? "1px solid rgba(255,255,255,0.40)" : "none" }}>
                    <div className="icon-circle icon-circle--36" style={{ background: i === 0 ? "rgba(234,179,8,0.12)" : $.greenBg, border: `1px solid ${i === 0 ? "rgba(234,179,8,0.25)" : $.greenRim}` }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="flex-1">
                      <div className="item-title">{it.name}</div>
                      <div className="item-sub">
                        {it.store || "—"}{it.date ? ` · ${it.date}` : ""}
                      </div>
                    </div>
                    <div className="mono fs-15 fw-700 color-green flex-shrink-0">
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
                <div className="section-heading mb-0">Ostatnie paragony</div>
                <button onClick={() => go("receipts")} className="btn-link">Wszystkie →</button>
              </div>
              <div className="flex-col gap-8">
                {recent.map(r => (
                  <div key={r.id} className="recent-receipt">
                    <div className="icon-box icon-box-38" style={{ background: $.greenBg, border: `1px solid ${$.greenRim}` }}>🧾</div>
                    <div className="flex-1">
                      <div className="item-title">{r.store || "Paragon"}</div>
                      <div className="item-sub">{r.date || "—"} · {(r.items || []).length} pozycji{(r.address || r.zip_code) ? ` · ${[r.zip_code, r.address].filter(Boolean).join(" ")}` : ""}</div>
                    </div>
                    <div className="mono receipt-total flex-shrink-0" style={{ fontSize: 16 }}>
                      {convertAmt(sumReceiptItems(r), currency)} {sym}
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
