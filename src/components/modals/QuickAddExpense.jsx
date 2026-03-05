import { useState, useRef, useEffect } from "react";
import { haptic } from '../../utils/helpers';
import { useAppData } from '../../contexts/AppDataContext';

export default function QuickAddExpense({ onClose, onManualEntry, onTextReceipt, onNeedKey }) {
  const { apiKey } = useAppData();
  const [textMode, setTextMode] = useState(false);
  const [textVal,  setTextVal]  = useState("");
  const textRef = useRef();
  const overlayRef = useRef();

  useEffect(() => {
    if (textMode) textRef.current?.focus();
  }, [textMode]);

  const handleFormMode = () => {
    haptic(20);
    onManualEntry();
    onClose();
  };

  return (
    <div className="qa-overlay" ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      role="dialog" aria-modal="true" aria-label="Dodaj wydatek">
      <div className="qa-drawer">
        <div className="qa-handle" aria-hidden="true" />
        <div className="qa-head">
          <div className="qa-title">{textMode ? "Wpisz listę" : "Dodaj wydatek"}</div>
          <div className="flex-row gap-6">
            <button onClick={() => setTextMode(m => !m)}
              className={`toggle-btn${textMode ? " active" : ""}`}>
              {textMode ? "Formularz" : "Wpisz listę"}
            </button>
            <button onClick={onClose} aria-label="Zamknij"
              className="close-btn-sm">✕</button>
          </div>
        </div>
        <div className="qa-body">

          {textMode ? (
            <>
              <div className="text-receipt-hint">
                Wpisz produkty — każdy w nowej linii. AI odczyta nazwy, ilości i ceny.
              </div>
              <textarea ref={textRef} className="field text-receipt-area" value={textVal} onChange={e => setTextVal(e.target.value)}
                placeholder={"mleko 2zł\n2kg ziemniaków 6zł\n3 jogurty greckie activia\nchleb razowy 5.50\nmasło extra 200g 8.99zł"} />
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
          ) : (
            <>
              <div className="text-receipt-hint" style={{ marginBottom: 16 }}>
                Wypełnij paragon ręcznie — ten sam formularz co przy skanowaniu zdjęcia.
                Użyj gdy paragon zaginął lub jest zbyt zniszczony.
              </div>
              <button className="btn-primary" onClick={handleFormMode}
                style={{ width: "100%", justifyContent: "center", minHeight: 52, fontSize: 16 }}
                aria-label="Otwórz formularz paragonu">
                ✦ Wypełnij paragon ręcznie
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
