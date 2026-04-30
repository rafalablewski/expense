import { useMemo, useState } from "react";
import { useAppData } from "../../contexts/AppDataContext";
import { TRANSCRIPT_RECEIPTS, TRANSCRIPT_BATCH_LABEL } from "../../data/transcriptReceipts";
import { haptic } from "../../utils/helpers";
import { lsGet, lsSet } from "../../services/localStorage";
import TranscriptPreviewModal from "../modals/TranscriptPreviewModal";

const DISMISS_KEY = `maszka_transcriptDismissed_${TRANSCRIPT_BATCH_LABEL}`;

export default function TranscriptReceiptsBanner() {
  const { receipts, setReceipts } = useAppData();
  const [dismissed, setDismissed] = useState(() => lsGet(DISMISS_KEY, false));
  const [previewing, setPreviewing] = useState(false);

  const missing = useMemo(() => {
    const have = new Set(receipts.map(r => r.id));
    return TRANSCRIPT_RECEIPTS.filter(r => !have.has(r.id));
  }, [receipts]);

  if (dismissed || missing.length === 0) return null;

  const totalPLN = missing.reduce((s, r) => s + r.total, 0).toFixed(2);

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
      <div className="seed-banner" role="status">
        <div className="seed-banner__icon" aria-hidden="true">🧾</div>
        <div className="seed-banner__text">
          <div className="seed-banner__title">
            {missing.length} {missing.length === 1 ? "paragon" : (missing.length < 5 ? "paragony" : "paragonów")} z transkrypcji {TRANSCRIPT_BATCH_LABEL}
          </div>
          <div className="seed-banner__sub">Razem {totalPLN} zł — sprawdź podgląd przed dodaniem</div>
        </div>
        <div className="seed-banner__actions">
          <button
            type="button"
            className="btn-primary btn-primary--small"
            onClick={() => { setPreviewing(true); haptic(10); }}
          >
            Podgląd i dodaj
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
