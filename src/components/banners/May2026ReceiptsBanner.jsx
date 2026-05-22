import { useMemo, useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { MAY_2026_RECEIPTS, MAY_2026_BATCH_LABEL } from "../../data/may2026Receipts";
import { haptic } from "../../utils/helpers";
import { lsGet, lsSet } from "../../services/localStorage";

const DISMISS_KEY = `maszka_may2026Dismissed_${MAY_2026_BATCH_LABEL}`;

export default function May2026ReceiptsBanner() {
  const { receipts, setReceipts } = useAppData();
  const [dismissed, setDismissed] = useState(() => lsGet(DISMISS_KEY, false));
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const missing = useMemo(() => {
    const have = new Set(receipts.map(r => r.id));
    return MAY_2026_RECEIPTS.filter(r => !have.has(r.id));
  }, [receipts]);

  if (dismissed || missing.length === 0) return null;

  const totalPLN = missing.reduce((s, r) => s + r.total, 0).toFixed(2);
  const noun = missing.length === 1 ? "paragon" : (missing.length < 5 ? "paragony" : "paragonów");

  const handleImport = () => {
    if (importing || imported) return;
    setImporting(true);
    setReceipts(prev => [...missing, ...prev]);
    setImported(true);
    haptic(30);
  };

  const handleDismiss = () => {
    lsSet(DISMISS_KEY, true);
    setDismissed(true);
  };

  return (
    <div className="may26-cta" role="region" aria-label="Import paragonów z maja 2026">
      <button
        type="button"
        className="may26-cta__close"
        onClick={handleDismiss}
        aria-label="Ukryj"
      >
        ×
      </button>
      <div className="may26-cta__icon" aria-hidden="true">🧾</div>
      <div className="may26-cta__copy">
        <div className="may26-cta__title">Paragony z maja 2026 do dodania</div>
        <div className="may26-cta__sub">
          {missing.length} {noun} · razem {totalPLN} zł
        </div>
      </div>
      <button
        type="button"
        className="may26-cta__btn"
        onClick={handleImport}
        disabled={importing || imported}
      >
        {imported ? "✓ Dodano" : importing ? "Dodawanie…" : "Dodaj do bazy"}
      </button>
    </div>
  );
}
