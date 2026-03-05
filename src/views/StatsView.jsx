import { useMemo, useState } from "react";
import $ from "../config/theme";
import { CATS, CAT_GROUPS, FX_SYMBOLS } from "../config/defaults";
import { parseDate, convertAmt, isRecurringPaused } from "../utils/helpers";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import InsightCard from "../components/charts/InsightCard";
import { useAppData } from "../contexts/AppDataContext";

export default function StatsView() {
  const { receipts, allItems, recurring, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";

  // ── Filter state (default to current month) ──
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [activeGroups, setActiveGroups] = useState({ "Spożywcze": true, "Rachunki": true, "Jednorazowe": true });
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [includeRecurring, setIncludeRecurring] = useState(true);

  // Build set of allowed categories from active groups
  const allowedCats = useMemo(() => {
    const set = new Set();
    Object.entries(CAT_GROUPS).forEach(([group, cats]) => {
      if (activeGroups[group]) cats.forEach(c => set.add(c));
    });
    return set;
  }, [activeGroups]);

  const toggleGroup = (group) => setActiveGroups(prev => ({ ...prev, [group]: !prev[group] }));

  // ── Merge all items: receipt items only (exclude recurring — handled separately) ──
  const allRaw = (allItems.length > 0 ? allItems :
    receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })))
  ).filter(it => it.source !== "recurring");

  // ── Available months for month filter ──
  const monthList = useMemo(() => {
    const set = new Set();
    const monthNames = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    const addMonth = (dateStr) => {
      if (!dateStr) return;
      const m1 = dateStr.match(/^(\d{4})-(\d{2})/);
      const m2 = dateStr.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
      if (m1) set.add(`${m1[1]}-${m1[2]}`);
      else if (m2) set.add(`${m2[3]}-${m2[2]}`);
    };
    receipts.forEach(r => addMonth(r.date));
    return [...set].sort().reverse().map(key => {
      const [y, m] = key.split("-");
      return { key, label: `${monthNames[parseInt(m, 10) - 1]} ${y}` };
    });
  }, [receipts]);

  // ── Unique stores for the shop filter ──
  const storeList = useMemo(() => {
    const set = new Set();
    allRaw.forEach(it => { if (it.store) set.add(it.store.trim()); });
    return [...set].sort((a, b) => a.localeCompare(b, "pl"));
  }, [allRaw]);

  // Helper: check if a date string matches selectedMonth
  const matchesMonth = (dateStr) => {
    if (!selectedMonth) return true;
    if (!dateStr) return false;
    const m1 = dateStr.match(/^(\d{4})-(\d{2})/);
    const m2 = dateStr.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
    let key = null;
    if (m1) key = `${m1[1]}-${m1[2]}`;
    else if (m2) key = `${m2[3]}-${m2[2]}`;
    return key === selectedMonth;
  };

  // ── Apply all filters to items ──
  const all = useMemo(() => allRaw.filter(item => {
    const cat = item.category || "Inne";
    if (!allowedCats.has(cat)) return false;
    if (selectedStore && (!item.store || item.store.trim() !== selectedStore)) return false;
    if (!matchesMonth(item.date)) return false;
    return true;
  }), [allRaw, allowedCats, selectedStore, selectedMonth]);

  // ── Filtered receipts — by store and month ──
  const filteredReceipts = useMemo(() =>
    receipts.filter(r => {
      if (selectedStore && (!r.store || r.store.trim() !== selectedStore)) return false;
      if (!matchesMonth(r.date)) return false;
      return true;
    }),
    [receipts, selectedStore, selectedMonth]
  );

  // ── Recurring subscriptions (monthly equivalent) ──
  const toMonthly = item => {
    const a = parseFloat(item.amount) || 0;
    return { "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 }[item.cycle] || a;
  };
  const activeRecurring = useMemo(() => recurring.filter(r => !isRecurringPaused(r)), [recurring]);
  const recurringMonthly = activeRecurring.reduce((s, r) => s + toMonthly(r), 0);

  // ── Category breakdown (from filtered items — single source of truth) ──
  const catTotals = useMemo(() => {
    const map = {};
    all.forEach(item => {
      const cat = item.category || "Inne";
      map[cat] = (map[cat] || 0) + (parseFloat(item.total_price) || 0);
    });
    // Include each active recurring subscription individually when toggled on
    if (includeRecurring) {
      activeRecurring.forEach(r => {
        const cat = r.category || "Subskrypcje";
        map[cat] = (map[cat] || 0) + toMonthly(r);
      });
    }
    return Object.entries(map)
      .map(([cat, value]) => ({ cat, value, color: CATS[cat] || "#9CA3AF" }))
      .sort((a, b) => b.value - a.value);
  }, [all, includeRecurring, activeRecurring]);

  // ── Monthly aggregation (from items — consistent with totals) ──
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
    all.forEach(item => addToMap(item.date, item.total_price));
    const months = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, total]) => {
        const [, mStr] = key.split("-");
        return { label: months[parseInt(mStr, 10) - 1] || mStr, total };
      });
  }, [all]);

  // ── Summary numbers ──
  // When all category groups are active, use receipt-level totals (matches Dashboard exactly).
  // When categories are filtered, fall back to item-level sums (only way to filter by category).
  const allGroupsOn = activeGroups["Spożywcze"] && activeGroups["Rachunki"] && activeGroups["Jednorazowe"];
  const receiptLevelTotal = filteredReceipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
  const itemLevelTotal = all.reduce((s, item) => s + (parseFloat(item.total_price) || 0), 0);
  const itemsTotal = allGroupsOn ? receiptLevelTotal : itemLevelTotal;
  const totalSpent  = itemsTotal + (includeRecurring ? recurringMonthly : 0);
  const totalSaved  = filteredReceipts.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);
  const totalCount  = filteredReceipts.length;
  const avgReceipt  = totalCount ? itemsTotal / totalCount : 0;
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
    all.forEach(item => {
      const d = parseDate(item.date);
      if (d) map[d.getDay()] += (parseFloat(item.total_price) || 0);
    });
    const maxVal = Math.max(...map);
    const maxIdx = map.indexOf(maxVal);
    return maxVal > 0 ? { day: days[maxIdx], amount: map[maxIdx] } : null;
  }, [all]);

  // Average items per receipt
  const avgItemsPerReceipt = useMemo(() => {
    if (!filteredReceipts.length) return 0;
    const total = filteredReceipts.reduce((s, r) => s + (r.items?.length || 0), 0);
    return (total / filteredReceipts.length).toFixed(1);
  }, [filteredReceipts]);

  // ── Check if any filter is active ──
  const anyGroupOff = !activeGroups["Spożywcze"] || !activeGroups["Rachunki"] || !activeGroups["Jednorazowe"];
  const hasActiveFilter = anyGroupOff || selectedStore !== "" || selectedMonth !== "";

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
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className={`stats-filter-select${selectedMonth ? " active" : ""}`}
            >
              <option value="">Cały okres</option>
              {monthList.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {hasActiveFilter && (
              <button
                onClick={() => { setActiveGroups({ "Spożywcze": true, "Rachunki": true, "Jednorazowe": true }); setSelectedStore(""); setSelectedMonth(""); }}
                className="stats-clear-btn"
              >
                Wyczyść filtry
              </button>
            )}
          </div>

          {/* ── Top stats row ── */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l: "Łącznie wydano",    v: convertAmt(totalSpent, currency),  u: sym, col: $.ink0 },
              { l: "Śr. paragon",       v: convertAmt(avgReceipt, currency),  u: sym, col: $.ink0 },
              { l: "Zaoszczędzono",     v: convertAmt(totalSaved, currency),  u: sym, col: $.red  },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.col }}>
                  {s.v}<span className="stat-val-unit">{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Recurring toggle ── */}
          {activeRecurring.length > 0 && (
            <button
              onClick={() => setIncludeRecurring(v => !v)}
              className={`stats-recurring-btn${includeRecurring ? " active" : ""}`}
            >
              <span className="stats-recurring-icon">🔄</span>
              {includeRecurring
                ? `Subskrypcje wliczone: +${convertAmt(recurringMonthly, currency)} ${sym}/mies.`
                : `+ Dodaj subskrypcje (${convertAmt(recurringMonthly, currency)} ${sym}/mies.)`}
            </button>
          )}

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
                        <span className="mono legend-amt">{convertAmt(d.value, currency)} {sym}</span>
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
                  `${i + 1}. ${it.name} — ${convertAmt(parseFloat(it.total_price) || 0, currency)} ${sym}${it.store ? ` (${it.store})` : ""}`
                ).join("\n")}
                accent={false}
              />
            )}

            {topCat && (
              <InsightCard
                icon="📌"
                title={`${topCat.cat} to Twój największy wydatek`}
                sub={`${convertAmt(topCat.value, currency)} ${sym} · ${topCatPct}% wszystkich wydatków`}
                accent={false}
              />
            )}

            {totalSaved > 0 && (
              <InsightCard
                icon="✦"
                title={`Zaoszczędziłeś ${savePct}% dzięki rabatom`}
                sub={`${convertAmt(totalSaved, currency)} ${sym} zaoszczędzono na ${filteredReceipts.length} paragonach`}
                accent={true}
              />
            )}

            {avgReceipt > 0 && (
              <InsightCard
                icon="🧾"
                title={`Średni paragon: ${convertAmt(avgReceipt, currency)} ${sym}`}
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
                sub={`${convertAmt(topDayOfWeek.amount, currency)} ${sym} łącznie w ten dzień tygodnia`}
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
