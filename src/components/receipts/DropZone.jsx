import { useState, useRef, useCallback } from 'react';

export default function DropZone({ onFiles, title, subtitle, icon }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const pick = useCallback(files => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imgs.length) onFiles(imgs);
  }, [onFiles]);
  return (
    <div
      role="button" tabIndex={0}
      aria-label={`${title || "Skanuj paragon"} — kliknij lub przeciągnij i upuść`}
      className={`dropzone${drag ? " drag" : ""}`}
      onClick={() => ref.current.click()}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
    >
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => pick(e.target.files)} />
      <div className="dropzone-content">
        <div className="dropzone-icon" aria-hidden="true">{icon || "📸"}</div>
        <div className="dropzone-title">{title || "Skanuj paragon"}</div>
        <div className="dropzone-sub">
          {subtitle || "Przeciągnij zdjęcie tutaj"}<br />
          <span className="dropzone-sub-hint">JPG · PNG · WEBP — Claude automatycznie odczyta dane</span>
        </div>
        <div className="dropzone-hint" aria-hidden="true">
          <svg width="13" height="13" fill="none" viewBox="0 0 13 13"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Wybierz pliki
        </div>
      </div>
    </div>
  );
}
