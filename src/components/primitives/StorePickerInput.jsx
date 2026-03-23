import { useState, useRef, useMemo, useEffect } from 'react';
import { normalize, stripStreetPrefix } from '../../utils/addressMatcher';

/**
 * StorePickerInput — dropdown with two sections:
 *  1. Store names (just the name, no address auto-fill)
 *  2. Store locations (name + address, auto-fills address fields)
 *
 * Props:
 *  - value: current store name string
 *  - onChange: called with store name string (always)
 *  - onSelectLocation: called with { store, address, zip_code, city } when a location is picked
 *  - storeLocations: array of { store, label, address, zip_code, city }
 *  - storeNames: array of unique store name strings (shown as name-only options)
 */
export default function StorePickerInput({ value, onChange, onSelectLocation, storeLocations = [], storeNames = [], id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Unique store names (from storeNames prop + deduped from locations)
  const nameEntries = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const name of storeNames) {
      const key = normalize(name);
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ store: name, searchText: key });
      }
    }
    for (const loc of storeLocations) {
      const key = normalize(loc.store);
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ store: loc.store, searchText: key });
      }
    }
    return result;
  }, [storeNames, storeLocations]);

  // Location entries (deduped by store+zip or store+address+city)
  const locEntries = useMemo(() => {
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

  const q = search.toLowerCase().trim();
  const filteredNames = useMemo(() => {
    if (!q) return nameEntries;
    return nameEntries.filter(e => e.searchText.includes(q));
  }, [q, nameEntries]);

  const filteredLocs = useMemo(() => {
    if (!q) return locEntries;
    return locEntries.filter(e => e.searchText.includes(q));
  }, [q, locEntries]);

  const selectName = (entry) => {
    onChange(entry.store);
    setSearch(entry.store);
    setOpen(false);
    // No onSelectLocation — user just wants the store name
  };

  const selectLocation = (entry) => {
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

  const hasResults = filteredNames.length > 0 || filteredLocs.length > 0;

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Wybierz sklep"}
        autoComplete="off" />
      {open && (
        <div className="store-picker-dropdown">
          {filteredNames.length > 0 && (
            <>
              <div className="store-picker-section">Sklepy</div>
              {filteredNames.map((entry) => (
                <div key={`name-${entry.store}`}
                  onClick={() => selectName(entry)}
                  className="store-picker-option">
                  <div className="store-picker-option-main">
                    <span className="store-picker-option-icon">🏪</span>
                    <span className="store-picker-option-name">{entry.store}</span>
                  </div>
                </div>
              ))}
            </>
          )}
          {filteredLocs.length > 0 && (
            <>
              <div className="store-picker-section">Lokalizacje</div>
              {filteredLocs.map((entry, i) => {
                const sub = [entry.address, entry.city].filter(Boolean).join(", ");
                return (
                  <div key={`loc-${entry.store}-${entry.zip_code || i}`}
                    onClick={() => selectLocation(entry)}
                    className="store-picker-option store-picker-option--loc">
                    <div className="store-picker-option-main">
                      <span className="store-picker-option-icon">📍</span>
                      <span className="store-picker-option-name">{entry.label}</span>
                    </div>
                    {sub && <div className="store-picker-option-sub">{sub}</div>}
                  </div>
                );
              })}
            </>
          )}
          {!hasResults && (
            <div className="store-picker-empty">
              {search ? "Nie znaleziono sklepu" : "Brak sklepów"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
