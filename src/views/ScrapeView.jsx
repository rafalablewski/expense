import { useState } from "react";
import $ from "../config/theme";
import Empty from "../components/primitives/Empty";

const SCRAPERAPI_BASE = "https://api.scraperapi.com";

export default function ScrapeView() {
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem("scraperapi_key") || "");
  const [url, setUrl]           = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [format, setFormat]     = useState("html"); // "html" | "json"
  const [keySaved, setKeySaved] = useState(false);

  const saveKey = () => {
    localStorage.setItem("scraperapi_key", apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const scrape = async () => {
    if (!apiKey || !url) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        url,
        render: "true",
      });

      const res = await fetch(`${SCRAPERAPI_BASE}?${params}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ScraperAPI ${res.status}: ${text.slice(0, 200)}`);
      }

      const body = await res.text();
      setResult(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && apiKey && url && !loading) {
      scrape();
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Scrape <span>stron</span></h1>
          <p className="page-subtitle au1">
            Pobieraj dane ze stron internetowych przez ScraperAPI
          </p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-20" style={{ maxWidth: 780 }}>

          {/* API Key card */}
          <div className="card au card--p28">
            <div className="flex-col gap-16">
              <div className="section-heading">Klucz API</div>
              <div className="flex-row gap-10" style={{ alignItems: "flex-end" }}>
                <div className="flex-col gap-6" style={{ flex: 1 }}>
                  <label className="item-sub" htmlFor="scrape-key">ScraperAPI Key</label>
                  <input
                    id="scrape-key"
                    type="password"
                    className="input"
                    placeholder="Wklej swój klucz ScraperAPI..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
                <button className="btn-primary" onClick={saveKey} style={{ whiteSpace: "nowrap" }}>
                  {keySaved ? "Zapisano!" : "Zapisz"}
                </button>
              </div>
            </div>
          </div>

          {/* Scrape card */}
          <div className="card au card--p28">
            <div className="flex-col gap-16">
              <div className="section-heading">Pobierz stronę</div>

              <div className="flex-col gap-6">
                <label className="item-sub" htmlFor="scrape-url">URL do pobrania</label>
                <input
                  id="scrape-url"
                  type="url"
                  className="input"
                  placeholder="https://example.com/products"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Format toggle */}
              <div>
                <div className="item-sub" style={{ marginBottom: 8 }}>Format odpowiedzi</div>
                <div className="pills-row" role="group" aria-label="Format">
                  {[
                    { id: "html", label: "HTML" },
                    { id: "json", label: "JSON" },
                  ].map(f => (
                    <button
                      key={f.id}
                      className={`pill${format === f.id ? " on" : ""}`}
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={scrape}
                disabled={!apiKey || !url || loading}
                style={{ alignSelf: "flex-start", gap: 10, opacity: (!apiKey || !url) ? 0.4 : 1 }}
              >
                {loading ? (
                  <>
                    <span className="spinner-sm" aria-hidden="true" />
                    Pobieram...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 1v9M3.5 7l4 4 4-4M2 13h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Pobierz
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="card au card--p28" style={{ borderLeft: `3px solid ${$.red}` }}>
              <div className="section-heading" style={{ color: $.red }}>Błąd</div>
              <pre className="mono fs-12" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color: $.ink1 }}>
                {error}
              </pre>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="au1">
              <div className="section-heading">
                Wynik · {result.length.toLocaleString("pl-PL")} znaków
              </div>
              <div className="card card--p28">
                <pre
                  className="mono fs-12"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: 500,
                    overflow: "auto",
                    color: $.ink1,
                  }}
                >
                  {format === "json" ? (() => {
                    try { return JSON.stringify(JSON.parse(result), null, 2); }
                    catch { return result; }
                  })() : result}
                </pre>
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <Empty icon="🌐" title="Wpisz URL" sub="Podaj adres strony, aby pobrać jej zawartość przez ScraperAPI" />
          )}

        </div>
      </div>
    </>
  );
}
