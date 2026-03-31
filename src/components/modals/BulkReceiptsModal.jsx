import { useState, useRef, useEffect } from "react";
import { haptic } from '../../utils/helpers';
import { useAppData } from '../../contexts/AppDataContext';
import { scanReceipt as scanReceiptAPI, parseTextReceipt as parseTextReceiptAPI, parseJsonReceipt as parseJsonReceiptAPI, getCorrectionsHint, compressImageIfNeeded } from '../../services/ai';
import { getCorrections, applyLearnedCorrections } from '../../hooks/useCorrections';
import { FX_SYMBOLS } from '../../config/defaults';

const SOURCES = [
  { id: "lidl", label: "Lidl Plus", icon: "\uD83D\uDFE1", accepts: "json,text" },
  { id: "biedronka", label: "Biedronka", icon: "\uD83D\uDC1E", accepts: "json" },
];

export default function BulkReceiptsModal({ onClose, onNeedKey }) {
  const { activeApiKey, aiProvider, currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";

  const [staged, setStaged] = useState([]); // receipts ready to submit
  const [adding, setAdding] = useState(null); // null | "pick" | "manual" | "text" | "json" | "photo" | "source:xxx"
  const [textVal, setTextVal] = useState("");
  const [processing, setProcessing] = useState(null); // string label or null
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const textRef = useRef();
  const fileRef = useRef();
  const photoRef = useRef();
  const overlayRef = useRef();

  useEffect(() => {
    if (adding === "text") textRef.current?.focus();
  }, [adding]);

  // ── Add via manual entry ──
  const addManual = () => {
    const receipt = {
      id: Date.now() + Math.random(),
      source: "manual",
      store: "",
      address: "",
      zip_code: "",
      city: "",
      date: new Date().toISOString().slice(0, 10),
      total: 0,
      total_discounts: 0,
      delivery_cost: null,
      delivery_free: false,
      items: [{ name: "", quantity: 1, unit: null, unit_price: 0, total_price: 0, discount: null, discount_label: null, category: "Inne" }],
    };
    setStaged(s => [...s, receipt]);
    setAdding(null);
    haptic(20);
  };

  // ── Add via text ──
  const addFromText = async () => {
    if (!textVal.trim()) return;
    if (!activeApiKey) { onNeedKey(); return; }
    setProcessing("Analiza tekstu...");
    setError(null);
    try {
      const parsed = await parseTextReceiptAPI(textVal.trim(), activeApiKey, aiProvider, getCorrectionsHint(getCorrections()));
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const newReceipts = arr.map((r, i) => ({
        ...applyLearnedCorrections(r),
        id: Date.now() + Math.random() + i,
        source: "import-text",
      }));
      setStaged(s => [...s, ...newReceipts]);
      setTextVal("");
      setAdding(null);
      haptic(30);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(null);
    }
  };

  // ── Add via JSON files ──
  const addFromJson = async (files, source = null) => {
    const jsonFiles = Array.from(files).filter(f =>
      f.name.endsWith(".json") || f.type === "application/json"
    );
    if (!jsonFiles.length) return;
    if (!activeApiKey) { onNeedKey(); return; }
    setError(null);
    for (const file of jsonFiles) {
      setProcessing(`${file.name}...`);
      try {
        const text = await file.text();
        const parsed = await parseJsonReceiptAPI(text, activeApiKey, aiProvider, source, getCorrectionsHint(getCorrections()));
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const sourceTag = source ? `import-${source}` : "import-json";
        const newReceipts = arr.map((r, i) => ({
          ...applyLearnedCorrections(r),
          id: Date.now() + Math.random() + i,
          source: sourceTag,
        }));
        setStaged(s => [...s, ...newReceipts]);
        haptic(30);
      } catch (e) {
        setError(`${file.name}: ${e.message}`);
      }
    }
    setProcessing(null);
    setAdding(null);
  };

  // ── Add via photo ──
  const addFromPhoto = async (files) => {
    if (!activeApiKey) { onNeedKey(); return; }
    setError(null);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      setProcessing(`${file.name}...`);
      try {
        const rawB64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const { b64, mediaType } = await compressImageIfNeeded(rawB64, file.type);
        const parsed = await scanReceiptAPI(b64, mediaType, activeApiKey, aiProvider, getCorrectionsHint(getCorrections()));
        const corrected = applyLearnedCorrections(parsed);
        setStaged(s => [...s, { ...corrected, id: Date.now() + Math.random(), source: "camera" }]);
        haptic(30);
      } catch (e) {
        setError(`${file.name}: ${e.message}`);
      }
    }
    setProcessing(null);
    setAdding(null);
  };

  // ── Remove staged receipt ──
  const removeStaged = (id) => {
    setStaged(s => s.filter(r => r.id !== id));
    haptic(15);
  };

  // ── Submit all ──
  const submitAll = () => {
    if (staged.length === 0) return;
    onClose(staged);
    haptic(30);
  };

  const activeSource = adding?.startsWith("source:") ? SOURCES.find(s => adding === `source:${s.id}`) : null;

  return (
    <div className="bulk-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose(null)}
      role="dialog" aria-modal="true" aria-label="Dodaj wiele paragonów">
      <div className="bulk-panel">
        <div className="qa-handle" aria-hidden="true" />

        {/* ── Header ── */}
        <div className="bulk-head">
          <div className="qa-title">Dodaj wiele paragonów</div>
          <div className="flex-row gap-6">
            <button onClick={() => onClose(null)} aria-label="Zamknij" className="close-btn-sm">✕</button>
          </div>
        </div>

        {/* ── Staged receipts list ── */}
        <div className="bulk-body">
          {staged.length === 0 && adding === null && (
            <div className="bulk-empty">
              <div className="bulk-empty-icon">📋</div>
              <div className="bulk-empty-text">Dodaj paragony rożnymi metodami, a potem zatwierdź wszystkie naraz</div>
            </div>
          )}

          {staged.length > 0 && (
            <div className="bulk-list">
              {staged.map((r, idx) => (
                <div key={r.id} className="bulk-receipt-card">
                  <div className="bulk-receipt-num">{idx + 1}</div>
                  <div className="bulk-receipt-info">
                    <div className="bulk-receipt-store">
                      {r.store || "Ręczny wpis"}
                    </div>
                    <div className="bulk-receipt-meta">
                      {r.date && <span>{r.date}</span>}
                      {r.items && <span>{r.items.length} {r.items.length === 1 ? "produkt" : r.items.length < 5 ? "produkty" : "produktów"}</span>}
                    </div>
                  </div>
                  <div className="bulk-receipt-total">
                    {(r.total || r.items?.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0) || 0).toFixed(2)} {sym}
                  </div>
                  <button className="bulk-receipt-remove" onClick={() => removeStaged(r.id)} aria-label="Usuń">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* ── Processing indicator ── */}
          {processing && (
            <div className="bulk-processing">
              <div className="bulk-processing-spinner" />
              <span>{processing}</span>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="bulk-error">
              {error}
              <button onClick={() => setError(null)} className="bulk-error-close">✕</button>
            </div>
          )}

          {/* ── Method picker ── */}
          {adding === "pick" && !processing && (
            <div className="bulk-picker">
              <div className="bulk-picker-title">Wybierz metodę</div>
              <div className="qa-methods">
                <button className="qa-method-card" onClick={() => {
                  haptic(15);
                  photoRef.current?.click();
                }}>
                  <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { if (e.target.files.length) addFromPhoto(e.target.files); }} />
                  <div className="qa-method-icon">📸</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Skanuj paragon</div>
                    <div className="qa-method-desc">Zrób zdjęcie lub wybierz plik</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={() => { haptic(15); addManual(); }}>
                  <div className="qa-method-icon">✏️</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Wpisz ręcznie</div>
                    <div className="qa-method-desc">Wypełnij formularz pole po polu</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={() => { haptic(15); setAdding("text"); }}>
                  <div className="qa-method-icon">💬</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Wklej tekst</div>
                    <div className="qa-method-desc">Wklej tekst paragonu lub listę</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={() => { haptic(15); setAdding("json"); }}>
                  <div className="qa-method-icon">📂</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Importuj JSON</div>
                    <div className="qa-method-desc">Wczytaj plik JSON</div>
                  </div>
                </button>
              </div>

              <div className="qa-sources-divider">
                <span>Źródła</span>
              </div>
              <div className="qa-sources">
                {SOURCES.map(s => (
                  <button key={s.id} className="qa-source-btn" onClick={() => { haptic(15); setAdding(`source:${s.id}`); }}>
                    <span className="qa-source-icon">{s.icon}</span>
                    <span className="qa-source-label">{s.label}</span>
                  </button>
                ))}
              </div>

              <button className="bulk-picker-cancel" onClick={() => setAdding(null)}>Anuluj</button>
            </div>
          )}

          {/* ── Text input ── */}
          {adding === "text" && !processing && (
            <div className="bulk-input-section">
              <div className="text-receipt-hint">
                Wklej tekst paragonu lub wpisz produkty — AI odczyta dane.
              </div>
              <textarea ref={textRef} className="field text-receipt-area" value={textVal}
                onChange={e => setTextVal(e.target.value)}
                placeholder={"Wklej tekst paragonu lub listę produktów..."} />
              <div className="bulk-input-actions">
                <button className="toggle-btn" onClick={() => { setAdding("pick"); setTextVal(""); }}>Wstecz</button>
                <button className="btn-primary" onClick={addFromText}
                  disabled={!textVal.trim()}
                  style={{ flex: 1, justifyContent: "center", minHeight: 44, opacity: textVal.trim() ? 1 : 0.4 }}>
                  Analizuj z AI
                </button>
              </div>
            </div>
          )}

          {/* ── JSON input ── */}
          {adding === "json" && !processing && (
            <div className="bulk-input-section">
              <div
                className={`qa-json-drop${dragOver ? " drag" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFromJson(e.dataTransfer.files); }}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".json,application/json" multiple className="hidden"
                  onChange={e => addFromJson(e.target.files)} />
                <div className="qa-json-drop-icon">📄</div>
                <div className="qa-json-drop-title">Przeciągnij pliki JSON</div>
                <div className="qa-json-drop-hint">
                  <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Wybierz pliki
                </div>
              </div>
              <button className="bulk-picker-cancel" onClick={() => setAdding("pick")}>Wstecz</button>
            </div>
          )}

          {/* ── Source-specific input ── */}
          {activeSource && !processing && (
            <div className="bulk-input-section">
              <div
                className={`qa-json-drop${dragOver ? " drag" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFromJson(e.dataTransfer.files, activeSource.id); }}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".json,application/json" multiple className="hidden"
                  onChange={e => addFromJson(e.target.files, activeSource.id)} />
                <div className="qa-json-drop-icon">{activeSource.icon}</div>
                <div className="qa-json-drop-title">Przeciągnij plik {activeSource.label}</div>
                <div className="qa-json-drop-hint">
                  <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Wybierz pliki
                </div>
              </div>
              <button className="bulk-picker-cancel" onClick={() => setAdding("pick")}>Wstecz</button>
            </div>
          )}

          {/* ── Add another button ── */}
          {adding === null && !processing && (
            <button className="bulk-add-btn" onClick={() => setAdding("pick")}>
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              Dodaj paragon
            </button>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bulk-footer">
          <div className="bulk-footer-count">
            {staged.length} {staged.length === 1 ? "paragon" : staged.length < 5 ? "paragony" : "paragonów"}
          </div>
          <button className="btn-primary bulk-submit-btn" onClick={submitAll}
            disabled={staged.length === 0}
            style={{ opacity: staged.length > 0 ? 1 : 0.4 }}>
            Przejdź do przeglądu
          </button>
        </div>
      </div>
    </div>
  );
}
