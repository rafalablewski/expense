import { useMemo, useState } from "react";
import $ from "../config/theme";
import { parseDate, sumReceiptItems } from "../utils/helpers";
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

export default function ExportView() {
  const { receipts } = useAppData();
  const [range,    setRange]    = useState("all");
  const [format,   setFormat]   = useState("items"); // "items" | "receipts"
  const [exported, setExported] = useState(false);

  const filtered = useMemo(() => {
    if (range === "all") return receipts;
    const days = parseInt(range, 10);
    const cutoff = new Date(Date.now() - days * 864e5);
    return receipts.filter(r => {
      const d = parseDate(r.date);
      return d && d >= cutoff;
    });
  }, [receipts, range]);

  const allItems = useMemo(() =>
    filtered.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, date: r.date }))
    ), [filtered]
  );

  const totalSpent = filtered.reduce((s, r) => s + sumReceiptItems(r), 0);
  const totalSaved = filtered.reduce((s, r) => s + (parseFloat(r.total_discounts) || 0), 0);

  const downloadCSV = () => {
    let rows, headers;

    if (format === "items") {
      headers = ["Produkt","Kategoria","Sklep","Data","Ilość","Jednostka","Cena jedn.","Opust","Razem"];
      rows = allItems.map(it => [
        it.name || "",
        it.category || "",
        it.store || "",
        it.date || "",
        it.quantity ?? 1,
        it.unit || "",
        it.unit_price != null ? parseFloat(it.unit_price).toFixed(2) : "",
        it.discount != null ? parseFloat(it.discount).toFixed(2) : "",
        parseFloat(it.total_price || 0).toFixed(2),
      ]);
    } else {
      headers = ["Sklep","Data","Pozycji","Łącznie","Zaoszczędzono"];
      rows = filtered.map(r => [
        r.store || "",
        r.date || "",
        (r.items || []).length,
        sumReceiptItems(r).toFixed(2),
        parseFloat(r.total_discounts || 0).toFixed(2),
      ]);
    }

    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `maszkaapp-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const previewRows = format === "items"
    ? allItems.slice(0, 6)
    : filtered.slice(0, 6);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Eksport <span>danych</span></h1>
          <p className="page-subtitle au1">
            {filtered.length} paragonów · {allItems.length} pozycji · {totalSpent.toFixed(2)} zł
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20" style={{ maxWidth: 780 }}>

          {/* ── Config card ── */}
          <div className="card au card--p28">
            <div className="flex-col gap-24">

              {/* Format */}
              <div>
                <div className="section-heading">
                  Co eksportować
                </div>
                <div className="flex-row flex-wrap gap-10">
                  {[
                    { id: "items",    label: "Pozycje",   sub: "Każdy produkt osobno",   icon: "📦" },
                    { id: "receipts", label: "Paragony",  sub: "Podsumowanie per wizyta", icon: "🧾" },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                      className={`export-format-btn${format === f.id ? " export-format-btn--active" : ""}`}
                    >
                      <span className="export-format-icon">{f.icon}</span>
                      <div>
                        <div className="export-format-label" style={{ color: format === f.id ? $.green : $.ink0 }}>{f.label}</div>
                        <div className="item-sub">{f.sub}</div>
                      </div>
                      {format === f.id && (
                        <div className="export-check">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range */}
              <div>
                <div className="section-heading">
                  Zakres czasowy
                </div>
                <div className="pills-row" role="group" aria-label="Zakres czasowy">
                  {[...TIME_RANGES].map(tr => (
                    <button key={tr.id} className={`pill${range === tr.id ? " on" : ""}`}
                      onClick={() => setRange(tr.id)} aria-pressed={range === tr.id}>
                      {tr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary row */}
              <div className="summary-row">
                {[
                  { l: "Wierszy CSV",    v: (format === "items" ? allItems.length : filtered.length).toLocaleString("pl-PL") },
                  { l: "Kolumn",         v: format === "items" ? "9" : "5" },
                  { l: "Łącznie",        v: `${totalSpent.toFixed(2)} zł` },
                  { l: "Zaoszczędzono",  v: `${totalSaved.toFixed(2)} zł` },
                ].map(s => (
                  <div key={s.l}>
                    <div className="export-stat-label">{s.l}</div>
                    <div className="mono export-stat-val">{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Download button */}
              <button
                className="btn-primary"
                onClick={downloadCSV}
                disabled={!filtered.length}
                style={{ alignSelf: "flex-start", gap: 10, opacity: filtered.length ? 1 : 0.4 }}
                aria-label="Pobierz plik CSV"
              >
                {exported ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8.5L5.5 12L14 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobrano!
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M3.5 7l4 4 4-4M2 13h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pobierz CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Preview table ── */}
          {previewRows.length > 0 && (
            <div className="au1">
              <div className="section-heading">
                Podgląd · pierwsze {previewRows.length} wierszy
              </div>
              <div className="card tbl-wrap">
                <table className="tbl" aria-label="Podgląd eksportu">
                  <thead>
                    <tr>
                      {format === "items"
                        ? ["Produkt","Kategoria","Sklep","Data","Razem"].map((h,i) => (
                            <th key={h} scope="col" className={i >= 4 ? "text-right" : "text-left"}>{h}</th>
                          ))
                        : ["Sklep","Data","Pozycji","Łącznie","Zaoszcz."].map((h,i) => (
                            <th key={h} scope="col" className={i >= 2 ? "text-right" : "text-left"}>{h}</th>
                          ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {format === "items"
                      ? (previewRows).map((it, i) => (
                          <tr key={i}>
                            <td className="td-name">{it.name}</td>
                            <td><CatChip cat={it.category} /></td>
                            <td className="color-ink2">{it.store || "—"}</td>
                            <td className="mono color-ink3 fs-12">{it.date || "—"}</td>
                            <td className="text-right"><Zl v={it.total_price} /></td>
                          </tr>
                        ))
                      : (previewRows).map((r, i) => (
                          <tr key={i}>
                            <td className="td-name">{r.store || "—"}</td>
                            <td className="mono color-ink3 fs-12">{r.date || "—"}</td>
                            <td className="mono text-right color-ink2">{(r.items || []).length}</td>
                            <td className="text-right"><Zl v={r.total} /></td>
                            <td className="text-right">
                              {parseFloat(r.total_discounts || 0) > 0
                                ? <span className="mono td-discount-13">−{parseFloat(r.total_discounts).toFixed(2)}</span>
                                : <span className="zl-dash">—</span>}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
                {(format === "items" ? allItems.length : filtered.length) > 6 && (
                  <div className="tbl-footer">
                    + {(format === "items" ? allItems.length : filtered.length) - 6} więcej wierszy w pliku CSV
                  </div>
                )}
              </div>
            </div>
          )}

          {!filtered.length && (
            <Empty icon="📂" title="Brak danych do eksportu" sub="Dodaj paragony, aby móc eksportować dane" />
          )}

        </div>
      </div>
    </>
  );
}
