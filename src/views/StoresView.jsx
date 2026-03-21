import { useMemo, useState } from "react";
import $ from "../config/theme";
import { FX_SYMBOLS, DEFAULT_STORES } from "../config/defaults";
import { convertAmt, parseDate, receiptSavings, sumReceiptItems, buildReceiptNumberMap } from "../utils/helpers";
import { normalize } from "../utils/addressMatcher";
import ReceiptDetailPopup from "../components/modals/ReceiptDetailPopup";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import Zl from "../components/primitives/Zl";
import { useAppData } from "../contexts/AppDataContext";

const TIME_RANGES = [
  { id: "7",   label: "7 dni"   },
  { id: "30",  label: "30 dni"  },
  { id: "90",  label: "3 mies." },
  { id: "all", label: "Wszystko" },
];

const TABS = [
  { id: "analytics", label: "Analiza" },
  { id: "database",  label: "Baza sklepów" },
];

const EMPTY_LOC = { store: "", label: "", address: "", zip_code: "", city: "" };

function StoreForm({ loc, onSave, onCancel, existingStores }) {
  const [form, setForm] = useState({ ...loc });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.store.trim() && form.label.trim();
  return (
    <div className="sdb-form">
      <div className="sdb-form-row">
        <div className="sdb-form-group sdb-form-grow">
          <label className="sdb-form-label">Sieć</label>
          <input className="field" value={form.store} onChange={e => set("store", e.target.value)}
            placeholder="np. Lidl" list="sdb-store-list" />
          <datalist id="sdb-store-list">
            {[...new Set([...DEFAULT_STORES, ...existingStores])].map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="sdb-form-group sdb-form-grow">
          <label className="sdb-form-label">Nazwa sklepu</label>
          <input className="field" value={form.label} onChange={e => set("label", e.target.value)}
            placeholder="np. Lidl Bazantowo" />
        </div>
      </div>
      <div className="sdb-form-row">
        <div className="sdb-form-group sdb-form-grow">
          <label className="sdb-form-label">Adres</label>
          <input className="field" value={form.address} onChange={e => set("address", e.target.value)}
            placeholder="np. Szarych Szeregów 3A" />
        </div>
      </div>
      <div className="sdb-form-row">
        <div className="sdb-form-group sdb-form-grow">
          <label className="sdb-form-label">Miasto</label>
          <input className="field" value={form.city} onChange={e => set("city", e.target.value)}
            placeholder="np. Katowice" />
        </div>
        <div className="sdb-form-group">
          <label className="sdb-form-label">Kod pocztowy</label>
          <input className="field sdb-zip" value={form.zip_code} onChange={e => set("zip_code", e.target.value)}
            placeholder="00-000" />
        </div>
      </div>
      <div className="sdb-form-actions">
        <button className="sdb-btn sdb-btn--save" disabled={!valid} onClick={() => onSave(form)}>Zapisz</button>
        <button className="sdb-btn sdb-btn--cancel" onClick={onCancel}>Anuluj</button>
      </div>
    </div>
  );
}

export default function StoresView() {
  const { receipts, currency, storeLocations, addStoreLocation, updateStoreLocation, deleteStoreLocation } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [tab,        setTab]        = useState("analytics");
  const [range,      setRange]      = useState("all");
  const [storeQ,     setStoreQ]     = useState("");
  const [activeStore,setActiveStore] = useState(null); // drilldown
  const [drillQ,     setDrillQ]     = useState("");
  const [drillCat,   setDrillCat]   = useState("All");
  const [expanded,   setExpanded]   = useState({});    // { storeKey: true }
  // Store database state
  const [editIdx,    setEditIdx]    = useState(null);  // index or "new"
  const [delConfirm, setDelConfirm] = useState(null);  // index
  const [popupReceiptId, setPopupReceiptId] = useState(null);
  const [popupNavList,   setPopupNavList]   = useState([]);
  const existingStores = useMemo(() => [...new Set(storeLocations.map(l => l.store))], [storeLocations]);
  const receiptNumberMap = useMemo(() => buildReceiptNumberMap(receipts), [receipts]);

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Filter receipts by time range ──
  const now = new Date();
  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(now - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  // ── Build store summary map (grouped by normalized store name, with locations) ──
  const storeMap = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const raw = (r.store || "Nieznany sklep").trim();
      const key = raw.toLowerCase();
      if (!map[key]) map[key] = { name: raw, visits: 0, total: 0, saved: 0, items: [], receipts: [], lastDate: null, locations: {}, cities: {} };
      map[key].visits++;
      map[key].total  += sumReceiptItems(r);
      map[key].saved  += receiptSavings(r);
      (r.items || []).forEach(it => map[key].items.push({ ...it, date: r.date, _address: r.address, _zip_code: r.zip_code, _city: r.city }));
      map[key].receipts.push({ id: r.id, date: r.date, total: sumReceiptItems(r), itemCount: (r.items || []).length, address: r.address, zip_code: r.zip_code, city: r.city });
      if (r.city) map[key].cities[r.city] = (map[key].cities[r.city] || 0) + 1;
      const d = parseDate(r.date);
      if (d && (!map[key].lastDate || d > map[key].lastDate)) map[key].lastDate = d;
      // Track locations by address/zip
      const locKey = [r.zip_code, r.address].filter(Boolean).map(normalize).join(" ") || null;
      if (locKey) {
        if (!map[key].locations[locKey]) map[key].locations[locKey] = { address: r.address || "", zip_code: r.zip_code || "", city: r.city || "", visits: 0, total: 0 };
        map[key].locations[locKey].visits++;
        map[key].locations[locKey].total += sumReceiptItems(r);
      }
    });
    return map;
  }, [filtered]);

  const stores = useMemo(() =>
    Object.values(storeMap)
      .filter(s => s.name.toLowerCase().includes(storeQ.toLowerCase()))
      .sort((a, b) => b.total - a.total),
    [storeMap, storeQ]
  );

  const totalAll = stores.reduce((s, st) => s + st.total, 0);

  // ── Drilldown data ──
  const drillStore = activeStore ? storeMap[activeStore.toLowerCase()] : null;
  const drillItems = useMemo(() => {
    if (!drillStore) return [];
    return drillStore.items.filter(it =>
      (it.name || "").toLowerCase().includes(drillQ.toLowerCase()) &&
      (drillCat === "All" || it.category === drillCat)
    );
  }, [drillStore, drillQ, drillCat]);
  const drillCats = drillStore
    ? ["All", ...new Set(drillStore.items.map(i => i.category).filter(Boolean))]
    : [];

  // ── Store initial letter avatar color ──
  const storeColor = name => {
    const colors = ["#06C167","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#0891B2","#D97706"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
    return colors[Math.abs(h) % colors.length];
  };

  const fmtDate = d => d ? d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner page-hero-flex">
          <div>
            {activeStore && tab === "analytics" ? (
              <>
                <button
                  onClick={() => { setActiveStore(null); setDrillQ(""); setDrillCat("All"); }}
                  className="btn-link-back"
                  aria-label="Wróć do listy sklepów"
                >
                  ← Sklepy
                </button>
                <h1 className="page-title au" style={{ fontSize: "clamp(26px,4vw,42px)" }}>{activeStore}</h1>
                {(() => {
                  const locs = storeLocations.filter(l => l.store.toLowerCase() === activeStore.toLowerCase());
                  if (!locs.length) return null;
                  return (
                    <div className="drill-locs">
                      {locs.map((l, i) => (
                        <span key={i} className="drill-loc">
                          📍 {l.label}{l.address || l.city ? ` — ${[l.address, l.zip_code, l.city].filter(Boolean).join(", ")}` : ""}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                <p className="page-subtitle au1">
                  {drillStore?.visits} wizyt · {drillStore?.items.length} pozycji · ostatnia {fmtDate(drillStore?.lastDate)}
                </p>
              </>
            ) : (
              <>
                <h1 className="page-title au">Moje <span>sklepy</span></h1>
                <p className="page-subtitle au1">
                  {tab === "analytics"
                    ? `${stores.length} sklepów · ${filtered.length} paragonów`
                    : `${storeLocations.length} zapisanych lokalizacji`}
                </p>
              </>
            )}
          </div>
          {/* Time range pills (analytics only) */}
          {!activeStore && tab === "analytics" && (
            <div className="pills-row flex-shrink-0" role="group" aria-label="Zakres czasowy">
              {TIME_RANGES.map(tr => (
                <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                  onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                  {tr.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Tab switcher */}
        {!activeStore && (
          <div className="sdb-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`sdb-tab${tab === t.id ? " sdb-tab--active" : ""}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="container">
        <div className="section flex-col gap-20">

          {/* ── LIST MODE (Analytics) ── */}
          {!activeStore && tab === "analytics" && (<>
            {/* Search */}
            <div className="au">
              <label htmlFor="sq" className="sr-only">Szukaj sklepu</label>
              <input id="sq" className="field" value={storeQ} onChange={e => setStoreQ(e.target.value)} placeholder="Szukaj sklepu…" />
            </div>

            {/* Store cards */}
            <div className="flex-col gap-10">
              {stores.length === 0 && (
                <div className="td-empty">Brak wyników</div>
              )}
              {stores.map((st, i) => {
                const pct = totalAll ? (st.total / totalAll * 100) : 0;
                const avg = st.visits ? st.total / st.visits : 0;
                const col = storeColor(st.name);
                const key = st.name.toLowerCase();
                const isExpanded = expanded[key];
                const sortedReceipts = [...st.receipts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
                return (
                  <div key={st.name} className="store-card-wrap" style={{ animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * .05}s both` }}>
                    <div className="store-card store-card--expandable">
                      {/* Expand toggle */}
                      <button
                        className={`budget-expand-btn${isExpanded ? " open" : ""}`}
                        onClick={() => toggleExpand(key)}
                        aria-label={isExpanded ? `Zwiń ${st.name}` : `Rozwiń ${st.name}`}
                        aria-expanded={isExpanded}
                      >
                        ▸
                      </button>

                      {/* Avatar */}
                      <div className="store-avatar" style={{ background: col + "18", border: `1px solid ${col}35`, color: col }}
                        onClick={() => toggleExpand(key)}>
                        {st.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1" onClick={() => toggleExpand(key)} style={{ cursor: "pointer" }}>
                        <div className="store-name">
                          {st.name}
                          <span className="budget-item-count">{st.visits}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex-row gap-8">
                          <div className="store-progress">
                            <div className="store-progress-fill" style={{ width: `${pct}%`, background: col }} />
                          </div>
                          <span className="store-pct">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="store-meta">
                          {(() => {
                            const locs = storeLocations.filter(l => l.store.toLowerCase() === key);
                            return locs.length > 0
                              ? locs.map((l, li) => <span key={li}>📍 {l.label}</span>)
                              : Object.keys(st.cities).length > 0 && <span>📍 {Object.keys(st.cities).join(", ")}</span>;
                          })()}
                          <span>{st.visits} wizyt</span>
                          <span>śr. {convertAmt(avg, currency)} {sym}/wizyta</span>
                          {st.saved > 0 && <span className="color-red">−{convertAmt(st.saved, currency)} {sym} saved</span>}
                          <span className="detail-label">ost. {fmtDate(st.lastDate)}</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="receipt-total-wrap">
                        <div className="mono store-total-val" style={{ color: col }}>
                          {convertAmt(st.total, currency)}
                        </div>
                        <div className="item-sub-sm">{sym} łącznie</div>
                      </div>

                      {/* Drilldown arrow */}
                      <button className="store-chevron" onClick={() => setActiveStore(st.name)}
                        aria-label={`Szczegóły ${st.name}`} title="Szczegóły">
                        ›
                      </button>
                    </div>

                    {/* Expanded receipt list: Store → City → Visit dates */}
                    {isExpanded && (
                      <div className="store-hierarchy">
                        {(() => {
                          const locs = storeLocations.filter(l => l.store.toLowerCase() === key);
                          const findLocLabel = (r) => {
                            const rAddr = (r.address || "").toLowerCase();
                            const rZip = (r.zip_code || "").toLowerCase();
                            const match = locs.find(l =>
                              (l.address && rAddr && l.address.toLowerCase() === rAddr) ||
                              (l.zip_code && rZip && l.zip_code.toLowerCase() === rZip)
                            );
                            return match ? match.label : [r.address, r.zip_code, r.city].filter(Boolean).join(", ") || "Nieznana lokalizacja";
                          };
                          const byLoc = {};
                          sortedReceipts.forEach(r => {
                            const loc = findLocLabel(r);
                            if (!byLoc[loc]) byLoc[loc] = [];
                            byLoc[loc].push(r);
                          });
                          return Object.entries(byLoc).map(([loc, recs]) => (
                            <div key={loc} className="store-hierarchy-city">
                              <div className="store-hierarchy-city-label" style={{ color: col }}>
                                <span className="store-hierarchy-dash">–</span> {loc}
                                <span className="store-hierarchy-count">{recs.length} wizyt</span>
                              </div>
                              <div className="store-hierarchy-visits">
                                {recs.map((r, j) => {
                                  const rNum = receiptNumberMap.get(r.id);
                                  return (
                                    <div key={r.id || j}
                                      className="store-hierarchy-visit store-hierarchy-visit--clickable"
                                      onClick={() => {
                                        setPopupNavList(recs.map(rec => rec.id));
                                        setPopupReceiptId(r.id);
                                      }}
                                    >
                                      <span className="store-hierarchy-vdash">—</span>
                                      {rNum && <span className="receipt-num">#{String(rNum).padStart(3, '0')}</span>}
                                      <span className="store-hierarchy-date">{r.date || "—"}</span>
                                      <span className="store-hierarchy-info">
                                        {r.itemCount > 0 && `${r.itemCount} prod.`}
                                      </span>
                                      <span className="mono store-hierarchy-total" style={{ color: col }}>
                                        {convertAmt(r.total, currency)} {sym}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* ── DRILLDOWN MODE ── */}
          {activeStore && drillStore && (<>
            {/* Drilldown stats */}
            <div className="stat-grid au stat-grid-3">
              {[
                { l: "Łącznie",    v: convertAmt(drillStore.total, currency), u: sym, col: storeColor(activeStore) },
                { l: "Wizyt",      v: drillStore.visits,                    u: "",  col: $.ink0 },
                { l: "Zaoszcz.",   v: convertAmt(drillStore.saved, currency), u: sym, col: $.red  },
              ].map(s => (
                <div className="stat-card" key={s.l}>
                  <div className="stat-label">{s.l}</div>
                  <div className="stat-val" style={{ color: s.col }}>
                    {s.v}<span className="stat-val-unit--sm">{s.u}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Locations */}
            {drillStore && Object.keys(drillStore.locations).length > 0 && (
              <div className="au1 flex-col gap-8">
                <div className="section-heading-sm">
                  Lokalizacje · {Object.keys(drillStore.locations).length}
                </div>
                {Object.values(drillStore.locations).map((loc, i) => {
                  const dbLocs = storeLocations.filter(l => l.store.toLowerCase() === activeStore.toLowerCase());
                  const match = dbLocs.find(l =>
                    (l.address && loc.address && l.address.toLowerCase() === loc.address.toLowerCase()) ||
                    (l.zip_code && loc.zip_code && l.zip_code.toLowerCase() === loc.zip_code.toLowerCase())
                  );
                  return (
                    <div key={i} className="location-card">
                      <span className="location-icon">📍</span>
                      <div className="flex-1">
                        <div className="location-name">
                          {match ? match.label : [loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ")}
                        </div>
                        {match && <div className="item-sub color-ink3">{[loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ")}</div>}
                        <div className="item-sub">{loc.visits} wizyt · {convertAmt(loc.total, currency)} {sym}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drill filters */}
            <div className="au1 flex-col gap-10">
              <input className="field" value={drillQ} onChange={e => setDrillQ(e.target.value)} placeholder={`Szukaj w ${activeStore}…`} />
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                {drillCats.map(dc => (
                  <button key={dc} className={`pill${drillCat === dc ? " on" : ""}`}
                    onClick={() => setDrillCat(dc)} aria-pressed={drillCat === dc}>
                    {dc === "All" ? "Wszystko" : dc}
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown table */}
            <div className="card tbl-wrap au2">
              <table className="tbl" aria-label={`Produkty z ${activeStore}`}>
                <thead>
                  <tr>
                    {["Produkt", "Kategoria", "Lokalizacja", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                      <th key={h} scope="col" className={i >= 4 ? "text-right" : "text-left"}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillItems.length === 0 ? (
                    <tr><td colSpan={8} className="td-no-results">Brak wyników</td></tr>
                  ) : drillItems.map((item, i) => {
                    const dbLocs = storeLocations.filter(l => l.store.toLowerCase() === activeStore.toLowerCase());
                    const locMatch = dbLocs.find(l =>
                      (l.address && item._address && l.address.toLowerCase() === item._address.toLowerCase()) ||
                      (l.zip_code && item._zip_code && l.zip_code.toLowerCase() === item._zip_code.toLowerCase())
                    );
                    const locLabel = locMatch ? locMatch.label : [item._address, item._city].filter(Boolean).join(", ") || "—";
                    return (
                    <tr key={i}>
                      <td className="td-name">{item.name}</td>
                      <td><CatChip cat={item.category} /></td>
                      <td className="fs-12 color-ink3">{locLabel}</td>
                      <td className="mono color-ink3 fs-12">{item.date || "—"}</td>
                      <td className="mono text-right color-ink2 fs-12">{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                      <td className="text-right"><Zl v={item.unit_price} /></td>
                      <td className="text-right">
                        {item.discount
                          ? <span className="mono td-discount-13">−{item.discount.toFixed(2)}</span>
                          : <span className="zl-dash">—</span>}
                      </td>
                      <td className="text-right"><Zl v={item.total_price} /></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── STORE DATABASE ── */}
          {!activeStore && tab === "database" && (
            <div className="sdb-section">
              <div className="sdb-header">
                <div className="section-heading-sm">Zapisane lokalizacje</div>
                <button className="sdb-btn sdb-btn--add" onClick={() => setEditIdx("new")}>
                  + Dodaj sklep
                </button>
              </div>

              {editIdx === "new" && (
                <StoreForm
                  loc={EMPTY_LOC}
                  existingStores={existingStores}
                  onSave={(loc) => { addStoreLocation(loc); setEditIdx(null); }}
                  onCancel={() => setEditIdx(null)}
                />
              )}

              {storeLocations.length === 0 && editIdx !== "new" && (
                <Empty icon="📍" title="Brak lokalizacji" sub="Dodaj swoje ulubione sklepy, aby szybko je wybierać na paragonach" />
              )}

              <div className="flex-col gap-8">
                {storeLocations.map((loc, i) => (
                  <div key={`${loc.store}-${loc.zip_code}-${i}`} className="sdb-card">
                    {editIdx === i ? (
                      <StoreForm
                        loc={loc}
                        existingStores={existingStores}
                        onSave={(updated) => { updateStoreLocation(i, updated); setEditIdx(null); }}
                        onCancel={() => setEditIdx(null)}
                      />
                    ) : (
                      <>
                        <div className="sdb-card-info">
                          <div className="sdb-card-name">{loc.label || loc.store}</div>
                          <div className="sdb-card-addr">
                            {[loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ")}
                          </div>
                          <div className="sdb-card-chain">{loc.store}</div>
                        </div>
                        <div className="sdb-card-actions">
                          <button className="sdb-action-btn" onClick={() => { setEditIdx(i); setDelConfirm(null); }}
                            title="Edytuj">
                            Edytuj
                          </button>
                          {delConfirm === i ? (
                            <>
                              <button className="sdb-action-btn sdb-action-btn--danger" onClick={() => { deleteStoreLocation(i); setDelConfirm(null); }}>
                                Na pewno?
                              </button>
                              <button className="sdb-action-btn" onClick={() => setDelConfirm(null)}>
                                Nie
                              </button>
                            </>
                          ) : (
                            <button className="sdb-action-btn sdb-action-btn--danger" onClick={() => setDelConfirm(i)}
                              title="Usuń">
                              Usuń
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
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
