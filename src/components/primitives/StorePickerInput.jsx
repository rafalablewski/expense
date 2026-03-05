import { useState, useRef, useMemo, useEffect } from 'react';
import { DEFAULT_STORES } from '../../config/defaults';

export default function StorePickerInput({ value, onChange, customStores = [], onAddCustomStore, id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allStores = useMemo(() => [...new Set([...DEFAULT_STORES, ...(customStores || [])])], [customStores]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? allStores.filter(s => s.toLowerCase().includes(q)) : allStores;
  }, [search, allStores]);

  const select = (s) => { onChange(s); setSearch(s); setOpen(false); };

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Wybierz lub wpisz sklep"}
        autoComplete="off" />
      {open && (
        <div className="store-picker-dropdown">
          {filtered.map(s => (
            <div key={s} onClick={() => select(s)} className="store-picker-option">
              {DEFAULT_STORES.includes(s) ? "🏪" : "📝"} {s}
            </div>
          ))}
          {search && !allStores.some(s => s.toLowerCase() === search.toLowerCase()) && (
            <div onClick={() => { if (onAddCustomStore) onAddCustomStore(search); select(search); }}
              className="store-picker-add">
              + Dodaj "{search}" jako nowy sklep
            </div>
          )}
          {!search && filtered.length === 0 && (
            <div className="store-picker-empty">Brak sklepów</div>
          )}
        </div>
      )}
    </div>
  );
}
