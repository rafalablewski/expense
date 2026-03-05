import { useMemo } from "react";
import $ from "../config/theme";
import { CATS, FX_SYMBOLS } from "../config/defaults";
import { convertAmt, parseDate } from "../utils/helpers";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

export default function PredictionView() {
  const { receipts, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";

  // Build last 6 months of data
  const monthlyData = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const d = parseDate(r.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map[key] = (map[key]||0) + (parseFloat(r.total)||0);
    });
    const sorted = Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
    const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
    return sorted.map(([key, total]) => {
      const [y, m] = key.split("-");
      return { key, label: MONTH_NAMES[parseInt(m,10)-1] + " '" + y.slice(2), total };
    });
  }, [receipts]);

  // Simple linear regression on last months
  const prediction = useMemo(() => {
    const data = monthlyData.slice(-6);
    if (data.length < 2) return null;
    const n = data.length;
    const xs = data.map((_, i) => i);
    const ys = data.map(d => d.total);
    const sumX  = xs.reduce((s,x) => s+x, 0);
    const sumY  = ys.reduce((s,y) => s+y, 0);
    const sumXY = xs.reduce((s,x,i) => s+x*ys[i], 0);
    const sumX2 = xs.reduce((s,x) => s+x*x, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    const predicted = slope * n + intercept;
    const avg = sumY / n;
    const trend = slope > avg * 0.03 ? "rosnący" : slope < -avg * 0.03 ? "malejący" : "stabilny";
    const trendColor = slope > avg * 0.03 ? $.red : slope < -avg * 0.03 ? $.green : $.ink2;
    return { predicted: Math.max(0, predicted), avg, slope, trend, trendColor, data };
  }, [monthlyData]);

  // Category breakdown prediction
  const catPrediction = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const recentMonths = 2;
    const cutoff = monthlyData.slice(-recentMonths);
    const keys = new Set(cutoff.map(m => m.key));
    const recentItems = receipts.flatMap(r => {
      const d = parseDate(r.date);
      if (!d) return [];
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!keys.has(key)) return [];
      return (r.items||[]).map(it => ({ ...it }));
    });
    const catMap = {};
    recentItems.forEach(it => {
      const cat = it.category || "Inne";
      catMap[cat] = (catMap[cat]||0) + (parseFloat(it.total_price)||0);
    });
    const total = Object.values(catMap).reduce((s,v)=>s+v,0);
    return Object.entries(catMap)
      .map(([cat, v]) => ({ cat, v: v/recentMonths, pct: total ? v/total*100 : 0, color: CATS[cat]||"#9CA3AF" }))
      .sort((a,b) => b.v - a.v)
      .slice(0, 8);
  }, [receipts, monthlyData]);

  const maxBar = monthlyData.length ? Math.max(...monthlyData.slice(-6).map(m=>m.total), prediction?.predicted||0, 1) : 1;
  const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];
  const nextMonth = MONTH_NAMES[(new Date().getMonth()+1) % 12];

  if (monthlyData.length < 2) return (
    <>
      <div className="page-hero"><div className="page-hero-inner">
        <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
        <p className="page-subtitle">Potrzebujesz co najmniej 2 miesięcy danych</p>
      </div></div>
      <div className="container">
        <Empty icon="🔮" title="Za mało danych" sub="Dodaj paragony z co najmniej 2 różnych miesięcy aby zobaczyć prognozę" />
      </div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Predykcja <span>wydatków</span></h1>
          <p className="page-subtitle au1">Prognoza na {nextMonth} na podstawie Twoich danych</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-20">

          {/* Hero prediction card */}
          {prediction && (
            <div className="card au card--p32 pos-relative overflow-hidden">
              <div className="prediction-circle" />
              <div className="section-heading">
                Prognozowane wydatki — {nextMonth}
              </div>
              <div className="prediction-amount">
                {convertAmt(prediction.predicted, currency)}
                <span className="prediction-amount-unit">{sym}</span>
              </div>
              <div className="flex-row flex-wrap gap-24">
                <div>
                  <div className="prediction-stat-label">Trend</div>
                  <div className="pred-meta-val" style={{ color: prediction.trendColor }}>
                    {prediction.trend === "rosnący" ? "↑" : prediction.trend === "malejący" ? "↓" : "→"} {prediction.trend}
                  </div>
                </div>
                <div>
                  <div className="prediction-stat-label">Średnia miesięczna</div>
                  <div className="mono pred-meta-val color-ink0">
                    {convertAmt(prediction.avg, currency)} {sym}
                  </div>
                </div>
                <div>
                  <div className="prediction-stat-label">Zmiana vs śr.</div>
                  <div className="mono pred-meta-val" style={{ color: prediction.predicted > prediction.avg ? $.red : $.green }}>
                    {prediction.predicted > prediction.avg ? "+" : ""}{convertAmt(prediction.predicted - prediction.avg, currency)} {sym}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bar chart - history + prediction */}
          <div className="card au1 card--p24">
            <div className="section-heading mb-20">
              Historia + prognoza
            </div>
            <div className="flex-row" style={{ alignItems:"flex-end", gap:10, height:120 }}>
              {monthlyData.slice(-6).map((m, i) => {
                const h = Math.max(8, (m.total / maxBar) * 100);
                return (
                  <div key={m.key} className="pred-bar-col">
                    <span className="mono pred-bar-amt">{convertAmt(m.total, currency)}</span>
                    <div className="pred-bar pred-bar--history" style={{ height: h, transition: `height .7s cubic-bezier(.16,1,.3,1) ${i*.05}s` }} />
                    <span className="pred-bar-label">{m.label}</span>
                  </div>
                );
              })}
              {/* Prediction bar */}
              {prediction && (
                <div className="pred-bar-col">
                  <span className="mono pred-bar-label color-green fw-700">{convertAmt(prediction.predicted, currency)}</span>
                  <div className="pred-bar pred-bar--future" style={{ height: Math.max(8,(prediction.predicted/maxBar)*100) }} />
                  <span className="pred-bar-label color-green fw-700">{nextMonth} ✦</span>
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {catPrediction.length > 0 && (
            <div className="card au2 card--p24">
              <div className="section-heading mb-16">
                Prognoza per kategoria (śr. ostatnie 2 mies.)
              </div>
              <div className="flex-col gap-10">
                {catPrediction.map(cp => (
                  <div key={cp.cat} className="pred-cat-row">
                    <div className="legend-dot" style={{ background:cp.color }} />
                    <div className="pred-cat-name">{cp.cat}</div>
                    <div className="pred-cat-bar">
                      <div className="pred-cat-fill" style={{ width:`${cp.pct}%`, background:cp.color }} />
                    </div>
                    <span className="mono fs-12 color-ink2 text-right flex-shrink-0" style={{ width: 80 }}>
                      {convertAmt(cp.v, currency)} {sym}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-muted">
            Prognoza oparta na regresji liniowej z ostatnich {Math.min(6, monthlyData.length)} miesięcy
          </p>
        </div>
      </div>
    </>
  );
}
