import { useMemo, useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { SEED_RECEIPTS, SEED_BATCH_LABEL } from "../../data/seedReceipts";
import { haptic } from "../../utils/helpers";
import { lsGet, lsSet } from "../../services/localStorage";

const DISMISS_KEY = `maszka_seedDismissed_${SEED_BATCH_LABEL}`;

export default function SeedReceiptsBanner() {
  const { receipts, setReceipts } = useAppData();
  const [dismissed, setDismissed] = useState(() => lsGet(DISMISS_KEY, false));
  const [importing, setImporting] = useState(false);

  const missing = useMemo(() => {
    const have = new Set(receipts.map(r => r.id));
    return SEED_RECEIPTS.filter(r => !have.has(r.id));
  }, [receipts]);

  if (dismissed || missing.length === 0) return null;

  const totalPLN = missing.reduce((s, r) => s + r.total, 0).toFixed(2);

  const handleImport = () => {
    setImporting(true);
    setReceipts(prev => [...missing, ...prev]);
    haptic(30);
  };

  const handleDismiss = () => {
    lsSet(DISMISS_KEY, true);
    setDismissed(true);
  };

  return (
    <div className="seed-banner" role="status">
      <div className="seed-banner__icon" aria-hidden="true">📥</div>
      <div className="seed-banner__text">
        <div className="seed-banner__title">
          {missing.length} {missing.length === 1 ? "paragon" : (missing.length < 5 ? "paragony" : "paragonów")} do dodania
        </div>
        <div className="seed-banner__sub">Razem {totalPLN} zł — z transkrypcji {SEED_BATCH_LABEL}</div>
      </div>
      <div className="seed-banner__actions">
        <button
          type="button"
          className="btn-primary btn-primary--small"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? "Dodawanie…" : "Dodaj wszystkie"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleDismiss}
          aria-label="Ukryj banner"
        >
          Ukryj
        </button>
      </div>
    </div>
  );
}
