import { useState, useRef, useMemo, useEffect } from 'react';
import { normalize, stripStreetPrefix } from '../../utils/addressMatcher';

/**
 * StorePickerInput — shows store locations (name + address) as dropdown options.
 * Only shows locations from the store database (Baza sklepów).
 *
 * Props:
 *  - value: current store name string
 *  - onChange: called with store name string
 *  - onSelectLocation: called with { store, address, zip_code, city } when a location is picked
 *  - storeLocations: array of { store, label, address, zip_code, city }
 */
export default function StorePickerInput({ value, onChange, onSelectLocation, storeLocations = [], id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build list from store locations only — dedup by store+zip
  const entries = useMemo(() => {
    const result = [];
    const seen = new Set();

    for (const loc of storeLocations) {
      const z = normalize(loc.zip_code);
      const key = z ? `${normalize(loc.store)}|${z}` : `${normalize(loc.store)}|${stripStreetPrefix(normalize(loc.address))}|${normalize(loc.city)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        store: loc.store,
        label: loc.label || loc.store,
        address: loc.address || "",
        zip_code: loc.zip_code || "",
        city: loc.city || "",
        searchText: `${loc.store} ${loc.label || ""} ${loc.address || ""} ${loc.city || ""}`.toLowerCase(),
      });
    }

    return result;
  }, [storeLocations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(e => e.searchText.includes(q));
  }, [search, entries]);

  const selectEntry = (entry) => {
    onChange(entry.store);
    setSearch(entry.label);
    setOpen(false);
    if (onSelectLocation) {
      onSelectLocation({
        store: entry.store,
        address: entry.address,
        zip_code: entry.zip_code,
        city: entry.city,
      });
    }
  };

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Wybierz sklep"}
        autoComplete="off" />
      {open && (
        <div className="store-picker-dropdown">
          {filtered.map((entry, i) => {
            const sub = [entry.address, entry.city].filter(Boolean).join(", ");
            return (
              <div key={`${entry.store}-${entry.zip_code || i}`}
                onClick={() => selectEntry(entry)}
                className="store-picker-option store-picker-option--loc">
                <div className="store-picker-option-main">
                  <span className="store-picker-option-icon">📍</span>
                  <span className="store-picker-option-name">{entry.label}</span>
                </div>
                {sub && <div className="store-picker-option-sub">{sub}</div>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="store-picker-empty">
              {search ? "Nie znaleziono sklepu" : "Brak sklepów — dodaj w Baza sklepów"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
