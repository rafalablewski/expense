import { useState } from "react";
import $ from "../config/theme";
import { CAT_GROUPS, FX_SYMBOLS } from "../config/defaults";
import CatChip from "../components/primitives/CatChip";
import Empty from "../components/primitives/Empty";
import Zl from "../components/primitives/Zl";
import { convertAmt, receiptSavings, sumReceiptItems } from "../utils/helpers";
import { useAppData } from "../contexts/AppDataContext";

export default function ProductsView() {
  const { receipts, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const all = receipts.flatMap(r => (r.items || []).map(it => ({ ...it, store: r.store, date: r.date })));
  const cats = [...new Set(all.map(i => i.category).filter(Boolean))];
  const list = all.filter(i =>
    (i.name || "").toLowerCase().includes(q.toLowerCase()) &&
    (cat === "All" || i.category === cat)
  );
  const spent = receipts.reduce((s, r) => s + sumReceiptItems(r), 0);
  const saved = receipts.reduce((s, r) => s + receiptSavings(r), 0);

  if (!receipts.length) return (
    <>
      <div className="page-hero"><div className="page-hero-inner"><h1 className="page-title">Produkty</h1></div></div>
      <div className="container"><Empty icon="🛒" title="Brak produktów" sub="Dodaj paragony, aby zobaczyć bazę produktów" /></div>
    </>
  );

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Baza <span>wydatków</span></h1>
          <p className="page-subtitle au1">{all.length} produktów ze {receipts.length} paragon{receipts.length === 1 ? "u" : "ów"}</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20">

          {/* Stats */}
          <div className="stat-grid au stat-grid-3">
            {[
              { l: "Produktów", v: all.length, unit: "", color: $.ink0 },
              { l: "Wydano łącznie", v: convertAmt(spent, currency), unit: sym, color: $.green },
              { l: "Zaoszczędzono", v: convertAmt(saved, currency), unit: sym, color: $.red },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-val" style={{ color: s.color }}>
                  {s.v}<span className="stat-val-unit">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="au1 flex-col gap-12">
            <label htmlFor="psearch" className="sr-only">Szukaj produktu</label>
            <input
              id="psearch"
              className="field"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj produktu…"
            />
            <div className="flex-col gap-8">
              <div className="pills-row" role="group" aria-label="Filtruj kategorię">
                <button className={`pill${cat === "All" ? " on" : ""}`} onClick={() => setCat("All")} aria-pressed={cat === "All"}>Wszystko</button>
                {Object.entries(CAT_GROUPS).map(([group, groupCats]) => {
                  const available = groupCats.filter(gc => cats.includes(gc));
                  if (!available.length) return null;
                  return (
                    <span key={group} className="d-contents">
                      <span className="pills-separator" aria-hidden="true" />
                      <span className="pills-group-label">{group}</span>
                      {available.map(gc => (
                        <button key={gc} className={`pill${cat === gc ? " on" : ""}`} onClick={() => setCat(gc)} aria-pressed={cat === gc}>{gc}</button>
                      ))}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card tbl-wrap au2">
            <table className="tbl" aria-label="Baza produktów">
              <thead>
                <tr>
                  {["Produkt", "Kategoria", "Sklep", "Data", "Ilość", "Cena jedn.", "Opust", "Razem"].map((h, i) => (
                    <th key={h} scope="col" className={i >= 4 ? "text-right" : "text-left"}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={8} className="td-no-results">Brak wyników dla &ldquo;{q}&rdquo;</td></tr>
                ) : list.map((item, i) => (
                  <tr key={i}>
                    <td className="td-name">{item.name}</td>
                    <td><CatChip cat={item.category} /></td>
                    <td className="color-ink2">{item.store || "—"}</td>
                    <td className="mono color-ink3 fs-12">{item.date || "—"}</td>
                    <td className="mono text-right color-ink2 fs-12">{item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                    <td className="text-right"><Zl v={item.unit_price} /></td>
                    <td className="text-right">
                      {item.discount
                        ? <span className="mono td-discount-13">−{item.discount.toFixed(2)}</span>
                        : <span className="zl-dash">—</span>
                      }
                    </td>
                    <td className="text-right"><Zl v={item.total_price} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
