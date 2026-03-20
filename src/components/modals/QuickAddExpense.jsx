import { useState, useRef, useEffect } from "react";
import { haptic } from '../../utils/helpers';
import { useAppData } from '../../contexts/AppDataContext';

const SOURCES = [
  { id: "lidl", label: "Lidl Plus", icon: "\uD83D\uDFE1", color: "#0050AA",
    instructions: "Jak pobrać dane z Lidl Plus:\n1. Zainstaluj lidl-plus (Python): pip install lidl-plus\n2. Uruchom: lidl-plus receipt --all\n3. Wklej wynik poniżej lub zapisz jako .json i przeciągnij tutaj",
    accepts: "json,text" },
  { id: "biedronka", label: "Biedronka", icon: "\uD83D\uDC1E", color: "#E30613",
    instructions: "Jak pobrać e-paragon z Biedronki:\n1. Otwórz aplikację Moja Biedronka\n2. Idź do Historia transakcji\n3. Pobierz e-paragon jako JSON\n4. Przeciągnij plik tutaj",
    accepts: "json" },
];

export default function QuickAddExpense({ onClose, onManualEntry, onTextReceipt, onJsonImport, onSourceImport, onNeedKey, onBulkAdd }) {
  const { apiKey } = useAppData();
  const [mode, setMode] = useState(null); // null = menu, "text", "json", "source:lidl", "source:biedronka"
  const [textVal, setTextVal] = useState("");
  const [sourceTextVal, setSourceTextVal] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const textRef = useRef();
  const sourceTextRef = useRef();
  const fileRef = useRef();
  const sourceFileRef = useRef();
  const overlayRef = useRef();

  useEffect(() => {
    if (mode === "text") textRef.current?.focus();
    if (mode?.startsWith("source:")) sourceTextRef.current?.focus();
  }, [mode]);

  const handleFormMode = () => {
    haptic(20);
    onManualEntry();
    onClose();
  };

  const handleJsonFiles = (files) => {
    const jsonFiles = Array.from(files).filter(f =>
      f.name.endsWith(".json") || f.type === "application/json"
    );
    if (jsonFiles.length) {
      haptic(20);
      onJsonImport(jsonFiles);
      onClose();
    }
  };

  const handleSourceFiles = (source, files) => {
    const jsonFiles = Array.from(files).filter(f =>
      f.name.endsWith(".json") || f.type === "application/json"
    );
    if (jsonFiles.length) {
      haptic(20);
      onSourceImport(source, jsonFiles, null);
      onClose();
    }
  };

  const handleSourceText = (source) => {
    if (!sourceTextVal.trim()) return;
    if (!apiKey) { onNeedKey(); return; }
    haptic(20);
    onSourceImport(source, null, sourceTextVal.trim());
    onClose();
  };

  const activeSource = mode?.startsWith("source:") ? SOURCES.find(s => mode === `source:${s.id}`) : null;

  return (
    <div className="qa-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div className="qa-drawer">
        <div className="qa-handle" aria-hidden="true" />
        <div className="qa-head">
          <div className="qa-title">
            {mode === null && "Dodaj wydatek"}
            {mode === "text" && "Wklej tekst"}
            {mode === "json" && "Importuj JSON"}
            {activeSource && activeSource.label}
          </div>
          <div className="flex-row gap-6">
            {mode !== null && (
              <button onClick={() => { setMode(null); setSourceTextVal(""); }} className="toggle-btn">
                Wstecz
              </button>
            )}
            <button onClick={onClose} aria-label="Zamknij" className="close-btn-sm">✕</button>
          </div>
        </div>
        <div className="qa-body">

          {/* ── MAIN MENU ── */}
          {mode === null && (
            <>
              <div className="qa-methods">
                <button className="qa-method-card" onClick={() => {
                  haptic(20);
                  onClose();
                  // Trigger the file picker on ReceiptsView DropZone via parent
                  document.querySelector('.dropzone')?.click();
                }}>
                  <div className="qa-method-icon">📸</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Skanuj paragon</div>
                    <div className="qa-method-desc">Zrób zdjęcie lub przeciągnij — AI odczyta dane</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={handleFormMode}>
                  <div className="qa-method-icon">✏️</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Wpisz ręcznie</div>
                    <div className="qa-method-desc">Wypełnij formularz pole po polu</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={() => setMode("text")}>
                  <div className="qa-method-icon">💬</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Wklej tekst</div>
                    <div className="qa-method-desc">Wklej tekst paragonu lub listę — AI przeanalizuje</div>
                  </div>
                </button>

                <button className="qa-method-card" onClick={() => setMode("json")}>
                  <div className="qa-method-icon">📂</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Importuj JSON</div>
                    <div className="qa-method-desc">Wczytaj plik JSON z e-paragonu lub eksportu</div>
                  </div>
                </button>

                <button className="qa-method-card qa-method-card--accent" onClick={() => { haptic(20); onBulkAdd(); onClose(); }}>
                  <div className="qa-method-icon">📋</div>
                  <div className="qa-method-info">
                    <div className="qa-method-title">Dodaj wiele paragonów</div>
                    <div className="qa-method-desc">Dodaj kilka paragonów naraz — różnymi metodami</div>
                  </div>
                </button>
              </div>

              <div className="qa-sources-divider">
                <span>Źródła</span>
              </div>

              <div className="qa-sources">
                {SOURCES.map(s => (
                  <button key={s.id} className="qa-source-btn" onClick={() => { haptic(15); setMode(`source:${s.id}`); }}>
                    <span className="qa-source-icon">{s.icon}</span>
                    <span className="qa-source-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── TEXT MODE ── */}
          {mode === "text" && (
            <>
              <div className="text-receipt-hint">
                Wklej tekst paragonu lub wpisz produkty — każdy w nowej linii. AI odczyta sklep, daty, nazwy, ilości i ceny.
              </div>
              <textarea ref={textRef} className="field text-receipt-area" value={textVal} onChange={e => setTextVal(e.target.value)}
                placeholder={"Wklej cały tekst paragonu lub wpisz listę:\n\nmleko 2zł\n2kg ziemniaków 6zł\nchleb razowy 5.50\n\nlub tekst z paragonu fiskalnego..."} />
              <button className="btn-primary" onClick={() => {
                  if (!textVal.trim()) return;
                  if (!apiKey) { onNeedKey(); return; }
                  haptic(20);
                  onTextReceipt(textVal.trim());
                }}
                disabled={!textVal.trim()}
                style={{ width: "100%", justifyContent: "center", minHeight: 52, fontSize: 16, marginTop: 14, opacity: textVal.trim() ? 1 : 0.4 }}
                aria-label="Analizuj z AI">
                Analizuj z AI
              </button>
            </>
          )}

          {/* ── JSON IMPORT MODE ── */}
          {mode === "json" && (
            <>
              <div className="text-receipt-hint" style={{ marginBottom: 14 }}>
                Przeciągnij pliki JSON z e-paragonu, Lidl Plus, Biedronki lub dowolnego eksportu. AI rozpozna format automatycznie.
              </div>
              <div
                className={`qa-json-drop${dragOver ? " drag" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleJsonFiles(e.dataTransfer.files); }}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                aria-label="Wybierz pliki JSON"
              >
                <input ref={fileRef} type="file" accept=".json,application/json" multiple className="hidden"
                  onChange={e => handleJsonFiles(e.target.files)} />
                <div className="qa-json-drop-icon">📄</div>
                <div className="qa-json-drop-title">Przeciągnij pliki JSON</div>
                <div className="qa-json-drop-sub">
                  e-paragon · Lidl Plus · dowolny JSON
                </div>
                <div className="qa-json-drop-hint">
                  <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Wybierz pliki
                </div>
              </div>
            </>
          )}

          {/* ── SOURCE-SPECIFIC MODE ── */}
          {activeSource && (
            <>
              <div className="qa-source-instructions">
                {activeSource.instructions.split("\n").map((line, i) => (
                  <div key={i} className={line.startsWith("Jak") ? "qa-source-instr-title" : "qa-source-instr-step"}>
                    {line}
                  </div>
                ))}
              </div>

              <div
                className={`qa-json-drop${dragOver ? " drag" : ""}`}
                onClick={() => sourceFileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleSourceFiles(activeSource.id, e.dataTransfer.files); }}
                role="button" tabIndex={0}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && sourceFileRef.current?.click()}
                aria-label="Wybierz pliki JSON"
              >
                <input ref={sourceFileRef} type="file" accept=".json,application/json" multiple className="hidden"
                  onChange={e => handleSourceFiles(activeSource.id, e.target.files)} />
                <div className="qa-json-drop-icon">📄</div>
                <div className="qa-json-drop-title">Przeciągnij plik JSON</div>
                <div className="qa-json-drop-hint">
                  <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Wybierz pliki
                </div>
              </div>

              {activeSource.accepts.includes("text") && (
                <>
                  <div className="qa-sources-divider" style={{ margin: "16px 0 12px" }}>
                    <span>lub wklej tekst</span>
                  </div>
                  <textarea ref={sourceTextRef} className="field text-receipt-area" value={sourceTextVal}
                    onChange={e => setSourceTextVal(e.target.value)}
                    placeholder={`Wklej dane z ${activeSource.label}...`}
                    style={{ minHeight: 100 }} />
                  <button className="btn-primary" onClick={() => handleSourceText(activeSource.id)}
                    disabled={!sourceTextVal.trim()}
                    style={{ width: "100%", justifyContent: "center", minHeight: 48, fontSize: 15, marginTop: 12, opacity: sourceTextVal.trim() ? 1 : 0.4 }}>
                    Analizuj z AI
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
