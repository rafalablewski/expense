import Spinner from "../components/primitives/Spinner";
import DropZone from "../components/receipts/DropZone";
import ReceiptCard from "../components/receipts/ReceiptCard";

export default function ReceiptsView({ receipts, setReceipts, processing, errors, setErrors, onFiles }) {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title au">Twoje <span>dokumenty</span></h1>
          <p className="page-subtitle au1">Skanuj paragony i faktury — Claude odczyta wszystko automatycznie</p>
        </div>
      </div>

      <div className="container">
        <div className="section flex-col gap-16">
          <div className="au1"><DropZone onFiles={onFiles} /></div>

          <div className="flex-col gap-8">
            {processing.map(p => (
              <div key={p.id} className="toast-ok" role="status" aria-live="polite">
                <Spinner />
                <span>Analizuję <strong>{p.name}</strong>…</span>
              </div>
            ))}
            {errors.map((err, i) => (
              <div key={i} className="toast-err" role="alert">
                <span>{err}</span>
                <button onClick={() => setErrors(e => e.filter((_, j) => j !== i))} aria-label="Zamknij" className="btn-err-close">×</button>
              </div>
            ))}
          </div>

          {receipts.length > 0 && (
            <div>
              <div className="section-label">Zeskanowane · {receipts.length}</div>
              <div className="flex-col gap-10">
                {receipts.map((r, i) => (
                  <ReceiptCard
                    key={r.id} r={r} delay={i * 0.05}
                    onDelete={() => setReceipts(p => p.filter(x => x.id !== r.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {!receipts.length && !processing.length && (
            <p className="au2 empty-hint">
              Brak paragonów — dodaj pierwszy powyżej
            </p>
          )}
        </div>
      </div>
    </>
  );
}
