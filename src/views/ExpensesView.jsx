import { useMemo, useState, useRef, useEffect } from "react";
import $ from "../config/theme";
import { CAT_ICONS, FX_SYMBOLS } from "../config/defaults";
import { convertAmt, haptic, isRecurringPaused, sumReceiptItems, toMonthly } from "../utils/helpers";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import { useAppData } from "../contexts/AppDataContext";
import ReceiptDetailPopup from "../components/modals/ReceiptDetailPopup";

export default function ExpensesView() {
  const { receipts, setReceipts, recurring, setRecurring, updateReceipt, allItems: contextItems, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("All");
  const [src, setSrc] = useState("All"); // All | manual | receipt | recurring
  const [sort,setSort] = useState("date"); // date | amount | name
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [popupReceiptId, setPopupReceiptId] = useState(null);
  const [popupNavList,   setPopupNavList]   = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState("");
  const renameInputRef = useRef(null);

  // Use merged items from context (receipt items + recurring)
  const allItems = useMemo(() =>
    contextItems.map(it => ({
      ...it,
      total_price: parseFloat(it.total_price) || 0,
      note: it.note || null,
      type: it.source === "recurring" ? "recurring" : "one-time",
    })),
    [contextItems]
  );

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

  const totalReceipt   = receipts.reduce((s,r) => s + sumReceiptItems(r), 0);
  const totalRecurring = recurring.filter(r => !isRecurringPaused(r)).reduce((s,r) => s + toMonthly(r), 0);
  const totalAll       = totalReceipt + totalRecurring;

  useEffect(() => {
    if (editingIdx !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingIdx]);

  const startRename = (idx, name) => {
    setEditingIdx(idx);
    setEditName(name || "");
  };

  const commitRename = (item) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === (item.name || "")) {
      setEditingIdx(null);
      return;
    }
    if (item.source === "recurring" && item.id) {
      setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, name: trimmed } : r));
    } else if (item.receiptId) {
      const receipt = receipts.find(r => r.id === item.receiptId);
      if (receipt) {
        const updatedItems = receipt.items.map(it =>
          it.name === item.name && it.category === item.category && parseFloat(it.total_price) === parseFloat(item.total_price)
            ? { ...it, name: trimmed }
            : it
        );
        updateReceipt({ ...receipt, items: updatedItems });
      }
    }
    setEditingIdx(null);
    haptic(10);
  };

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
              { l:"Łącznie",      v:convertAmt(totalAll,       currency), u:sym,      col:$.ink0 },
              { l:"Z paragonów",  v:convertAmt(totalReceipt,   currency), u:sym,      col:"#3B82F6" },
              { l:"Subskrypcje",  v:convertAmt(totalRecurring, currency), u:sym+"/m", col:"#8B5CF6" },
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
                        {editingIdx === i ? (
                          <div className="rename-inline" onClick={e => e.stopPropagation()}>
                            <input
                              ref={renameInputRef}
                              className="rename-input"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") commitRename(item);
                                if (e.key === "Escape") setEditingIdx(null);
                              }}
                              onBlur={() => commitRename(item)}
                            />
                          </div>
                        ) : (
                          <div className="expense-name">{item.name}</div>
                        )}
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
                          {item.source === "receipt" && item.receiptId ? (
                            <span
                              className="source-badge source-badge-receipt source-badge--clickable"
                              onClick={() => {
                                const seen = new Set();
                                const navIds = list.filter(it => it.receiptId && !seen.has(it.receiptId) && seen.add(it.receiptId)).map(it => it.receiptId);
                                setPopupNavList(navIds);
                                setPopupReceiptId(item.receiptId);
                              }}
                            >
                              🧾 Paragon
                            </span>
                          ) : (
                            <span className={`source-badge source-badge-${item.source}`}>
                              {item.source==="recurring" ? "🔄 Cykliczny" : item.source==="manual" ? "✏️ Ręczny" : "🧾 Paragon"}
                            </span>
                          )}
                        </div>
                        {item.store && <div><span className="detail-label">Sklep:</span> {item.store}</div>}
                        {item.quantity && <div><span className="detail-label">Ilość:</span> {item.quantity}{item.unit ? ` ${item.unit}` : ""}</div>}
                        {item.unit_price && <div><span className="detail-label">Cena jedn.:</span> {convertAmt(item.unit_price, currency)} {sym}</div>}
                        {item.fuel_price_per_liter && <div><span className="detail-label">Cena za litr:</span> {convertAmt(item.fuel_price_per_liter, currency)} {sym}/L</div>}
                        {item.fuel_amount_liters && <div><span className="detail-label">Zatankowano:</span> {item.fuel_amount_liters} L</div>}
                        {item.discount > 0 && <div className="color-red"><span>Zniżka:</span> −{convertAmt(item.discount, currency)} {sym}</div>}
                        {item.note && <div className="detail-full" style={{ color:$.ink2 }}><span className="detail-label">Notatka:</span> {item.note}</div>}
                        <div className="detail-full" style={{ marginTop: 4, display: "flex", gap: 8 }}>
                          <button onClick={() => { haptic(10); startRename(i, item.name); }}
                            className="btn-rename">
                            ✏️ Zmień nazwę
                          </button>
                          {item.source==="manual" && item.id && (
                            <button onClick={() => { haptic(10); setReceipts(p => p.filter(x => x.id !== item.id)); }}
                              className="btn-delete">
                              🗑️ Usuń
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {popupReceiptId && (
        <ReceiptDetailPopup
          receiptId={popupReceiptId}
          navList={popupNavList}
          onClose={() => setPopupReceiptId(null)}
          onNavigate={(newId) => setPopupReceiptId(newId)}
        />
      )}
    </>
  );
}
