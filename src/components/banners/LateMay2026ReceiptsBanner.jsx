import { useMemo, useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { LATE_MAY_2026_RECEIPTS, LATE_MAY_2026_BATCH_LABEL } from "../../data/lateMay2026Receipts";
import { haptic } from "../../utils/helpers";
import { lsGet, lsSet } from "../../services/localStorage";
import TranscriptPreviewModal from "../modals/TranscriptPreviewModal";

const DISMISS_KEY = `maszka_lateMay2026Dismissed_${LATE_MAY_2026_BATCH_LABEL}`;

// Polish plural for "paragon": 1 → paragon; n%10 ∈ {2,3,4} (except teens 12–14) → paragony; otherwise → paragonów.
const paragonNoun = (n) => {
  if (n === 1) return "paragon";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "paragony";
  return "paragonów";
};

export default function LateMay2026ReceiptsBanner() {
  const { receipts, setReceipts } = useAppData();
  const [dismissed, setDismissed] = useState(() => lsGet(DISMISS_KEY, false));
  const [previewing, setPreviewing] = useState(false);

  const missing = useMemo(() => {
    const have = new Set(receipts.map(r => r.id));
    return LATE_MAY_2026_RECEIPTS.filter(r => !have.has(r.id));
  }, [receipts]);

  if (dismissed || missing.length === 0) return null;

  const totalPLN = missing.reduce((s, r) => s + r.total, 0).toFixed(2);
  const noun = paragonNoun(missing.length);

  // One-click import — setReceipts persists to Firestore via AppDataContext's write effect.
  const handleImport = () => {
    setReceipts(prev => [...missing, ...prev]);
    haptic(30);
  };

  const handleConfirm = (toAdd) => {
    setReceipts(prev => [...toAdd, ...prev]);
    haptic(30);
    setPreviewing(false);
  };

  const handleDismiss = () => {
    lsSet(DISMISS_KEY, true);
    setDismissed(true);
  };

  return (
    <>
      <div className="seed-banner" role="region" aria-label="Import paragonów z maja 2026">
        <div className="seed-banner__icon" aria-hidden="true">🧾</div>
        <div className="seed-banner__text">
          <div className="seed-banner__title">
            {missing.length} {noun} z maja 2026 do dodania
          </div>
          <div className="seed-banner__sub">Razem {totalPLN} zł — dodaj jednym kliknięciem lub sprawdź podgląd</div>
        </div>
        <div className="seed-banner__actions">
          <button
            type="button"
            className="btn-primary btn-primary--small"
            onClick={handleImport}
          >
            Dodaj do bazy
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setPreviewing(true); haptic(10); }}
          >
            Podgląd
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

      {previewing && (
        <TranscriptPreviewModal
          receipts={missing}
          onConfirm={handleConfirm}
          onCancel={() => setPreviewing(false)}
        />
      )}
    </>
  );
}
