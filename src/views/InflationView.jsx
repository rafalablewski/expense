import { useMemo, useState } from "react";
import $ from "../config/theme";
import { FX, FX_SYMBOLS } from "../config/defaults";
import { parseDate } from "../utils/helpers";
import SparkLine from "../components/charts/SparkLine";
import Empty from "../components/primitives/Empty";
import Zl from "../components/primitives/Zl";

export default function InflationView({ receipts, currency }) {
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
                <button key={n} className={`pill pill--sm${minOccurrences === n ? " on" : ""}`}
                  onClick={() => setMin(n)}>{n}+</button>
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
                      <th scope="col" className="text-left">Produkt</th>
                      <th scope="col" className="field--text-right">Pierwsza cena</th>
                      <th scope="col" className="field--text-right">Ostatnia cena</th>
                      <th scope="col" className="field--text-right">Zmiana</th>
                      <th scope="col" className="text-center">Trend</th>
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
                          <td className="td-name">{p.name}</td>
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
                          <td className="text-center" style={{ padding: "8px 12px" }}>
                            <SparkLine points={p.prices} color={color} width={100} height={28} />
                          </td>
                          <td className="field--text-right mono">
                            <span className="color-ink3 fs-12">{p.entries.length}×</span>
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
