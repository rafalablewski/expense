import { useMemo, useState } from "react";
import $ from "../config/theme";
import { CAT_ICONS, FX_SYMBOLS } from "../config/defaults";
import { convertAmt, haptic, isRecurringPaused } from "../utils/helpers";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";

export default function ExpensesView() {
  const { expenses, receipts, recurring, deleteExpense, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("All");
  const [src, setSrc] = useState("All"); // All | manual | receipt | recurring
  const [sort,setSort] = useState("date"); // date | amount | name
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  // Merge manual expenses + receipt items + recurring
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
      unit_price: null, quantity: null, discount: null,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({
        ...it, store: r.store, date: r.date, source: "receipt", type: "one-time", note: null,
      }))
    ),
    ...recurring.filter(r => !isRecurringPaused(r)).map(r => ({
      id: r.id, name: r.name, total_price: r.amount, category: r.category,
      date: null, store: null, note: r.cycle, source: "recurring", type: "recurring",
      unit_price: null, quantity: null, discount: null,
    })),
  ], [expenses, receipts, recurring]);

  const cats = useMemo(() => [...new Set(allItems.map(i => i.category).filter(Boolean))], [allItems]);

  const list = useMemo(() => {
    let out = allItems.filter(i =>
      (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
      (cat === "All" || i.category === cat) &&
      (src === "All" || i.source === src) &&
      (!dateFrom || (i.date || "") >= dateFrom) &&
      (!dateTo || (i.date || "") <= dateTo)
    );
    if (sort === "date") out = [...out].sort((a,b) => (b.date||"").localeCompare(a.date||""));
    if (sort === "amount") out = [...out].sort((a,b) => (parseFloat(b.total_price)||0) - (parseFloat(a.total_price)||0));
    if (sort === "name") out = [...out].sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return out;
  }, [allItems, q, cat, src, sort, dateFrom, dateTo]);

  const totalManual  = expenses.reduce((s,e) => s + e.amount, 0);
  const totalReceipt = receipts.reduce((s,r) => s + (parseFloat(r.total)||0), 0);
  const totalAll     = totalManual + totalReceipt;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Wszystkie <span>wydatki</span></h1>
          <p className="page-subtitle au1">{allItems.length} pozycji · {convertAmt(totalAll, currency)} {sym} łącznie</p>
        </div>
      </div>
      <div className="container">
        <div className="section flex-col gap-16">

          {/* Stats */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l:"Łącznie",      v:convertAmt(totalAll,    currency), u:sym, col:$.ink0  },
              { l:"Ręcznie",      v:convertAmt(totalManual, currency), u:sym, col:$.green },
              { l:"Z paragonów",  v:convertAmt(totalReceipt,currency), u:sym, col:"#3B82F6" },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color:s.col }}>
                  {s.v}<span className="stat-unit-sm">{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="au1 flex-col gap-10">
            <div className="onboard-btns">
              <input className="field" value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Szukaj wydatku…" style={{ flex: 1 }} />
              <select className="field" value={sort} onChange={e=>setSort(e.target.value)}
                style={{ width: "auto", flex: "none", minWidth: 130, cursor: "pointer" }}
                aria-label="Sortuj">
                <option value="date">Data ↓</option>
                <option value="amount">Kwota ↓</option>
                <option value="name">Nazwa A–Z</option>
              </select>
            </div>

            {/* Source toggle */}
            <div className="pills-row" role="group" aria-label="Źródło">
              {[["All","Wszystko"],["manual","✏️ Ręczne"],["receipt","🧾 Paragony"],["recurring","🔄 Cykliczne"]].map(([id,lbl])=>(
                <button key={id} className={`pill${src===id?" on":""}`}
                  onClick={()=>setSrc(id)} aria-pressed={src===id}>{lbl}</button>
              ))}
            </div>

            {/* Category filter */}
            <div className="pills-row" role="group" aria-label="Kategoria">
              <button className={`pill${cat==="All"?" on":""}`} onClick={()=>setCat("All")} aria-pressed={cat==="All"}>Wszystkie kat.</button>
              {cats.map(c => (
                <button key={c} className={`pill${cat===c?" on":""}`} onClick={()=>setCat(c)} aria-pressed={cat===c}>
                  {CAT_ICONS[c]||"📦"} {c}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="date-filter-row">
              <label className="date-label">Od:</label>
              <input className="field" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
              <label className="date-label">Do:</label>
              <input className="field" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
              {(dateFrom || dateTo) && (
                <button className="pill nowrap" onClick={()=>{ setDateFrom(""); setDateTo(""); }}>✕ Wyczyść</button>
              )}
            </div>
          </div>

          {/* List — collapsible cards */}
          {list.length === 0 ? (
            <Empty icon="📋" title="Brak wyników" sub="Spróbuj zmienić filtry lub dodaj pierwszy wydatek przyciskiem +" />
          ) : (
            <div className="au2 flex-col gap-8">
              {list.map((item, i) => {
                const isOpen = expanded === i;
                return (
                  <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                    className="glass-card cursor-pointer">

                    {/* Collapsed row */}
                    <div className="expense-row">
                      <span className="expense-icon">{CAT_ICONS[item.category]||"📦"}</span>
                      <div className="flex-1">
                        <div className="expense-name">{item.name}</div>
                        <div className="item-sub-sm">
                          {item.source==="recurring" ? "cykliczny" : (item.date||"—")}
                          {" · "}
                          {item.source==="recurring" ? "🔄" : item.source==="manual" ? "✏️" : "🧾"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="mono fw-600 fs-15">
                          {convertAmt(item.total_price||0, currency)} {sym}
                        </span>
                        {item.discount > 0 && (
                          <div className="discount-label color-red fw-600">−{convertAmt(item.discount, currency)}</div>
                        )}
                      </div>
                      <span className={`expand-chevron${isOpen ? " expand-chevron--open" : ""}`}>▼</span>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div onClick={e => e.stopPropagation()}
                        className="expense-detail-grid">
                        <div><span className="detail-label">Kategoria:</span> <CatChip cat={item.category} /></div>
                        <div>
                          <span className="detail-label">Źródło: </span>
                          <span className={`source-badge source-badge-${item.source}`}>
                            {item.source==="recurring" ? "🔄 Cykliczny" : item.source==="manual" ? "✏️ Ręczny" : "🧾 Paragon"}
                          </span>
                        </div>
                        {item.store && <div><span className="detail-label">Sklep:</span> {item.store}</div>}
                        {item.quantity && <div><span className="detail-label">Ilość:</span> {item.quantity}{item.unit ? ` ${item.unit}` : ""}</div>}
                        {item.unit_price && <div><span className="detail-label">Cena jedn.:</span> {convertAmt(item.unit_price, currency)} {sym}</div>}
                        {item.discount > 0 && <div className="color-red"><span>Zniżka:</span> −{convertAmt(item.discount, currency)} {sym}</div>}
                        {item.note && <div className="detail-full" style={{ color:$.ink2 }}><span className="detail-label">Notatka:</span> {item.note}</div>}
                        {item.source==="manual" && (
                          <div className="detail-full" style={{ marginTop: 4 }}>
                            <button onClick={() => { haptic(10); deleteExpense(item.id); }}
                              className="btn-delete">
                              🗑️ Usuń
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
