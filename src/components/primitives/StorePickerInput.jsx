import { useState, useRef, useMemo, useEffect } from 'react';
import { normalize, stripStreetPrefix, stripLegalSuffix } from '../../utils/addressMatcher';

/**
 * StorePickerInput — dropdown with two sections:
 *  1. Store names (just the name, no address change)
 *  2. Store locations (name + address, auto-fills address fields)
 *
 * Props:
 *  - value: current store name string
 *  - onChange: called with store name string when user types freely
 *  - onSelectStore: called with store name when user picks a name from the dropdown (no address change)
 *  - onSelectLocation: called with { store, address, zip_code, city } when a location is picked
 *  - storeLocations: array of { store, label, address, zip_code, city }
 *  - storeNames: array of unique store name strings (shown as name-only options)
 */
export default function StorePickerInput({ value, onChange, onSelectStore, onSelectLocation, storeLocations = [], storeNames = [], id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** Fuzzy search: checks if query words all appear in the target (as substrings) */
  const fuzzySearch = (target, query) => {
    const words = query.split(/\s+/).filter(Boolean);
    return words.every(w => target.includes(w));
  };

  // Unique store names (from storeNames prop + deduped from locations)
  const nameEntries = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const name of storeNames) {
      const key = stripLegalSuffix(normalize(name));
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ store: name, searchText: normalize(name) });
      }
    }
    for (const loc of storeLocations) {
      const key = stripLegalSuffix(normalize(loc.store));
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ store: loc.store, searchText: normalize(loc.store) });
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
        searchText: normalize(`${loc.store} ${loc.label || ""} ${loc.address || ""} ${loc.city || ""}`),
      });
    }
    return result;
  }, [storeLocations]);

  const q = normalize(search);
  const filteredNames = useMemo(() => {
    if (!q) return nameEntries;
    // Match if query is substring of name OR name contains the query (fuzzy word match)
    const stripped = stripLegalSuffix(q);
    return nameEntries.filter(e =>
      fuzzySearch(e.searchText, q) ||
      fuzzySearch(e.searchText, stripped) ||
      e.searchText.includes(stripped)
    );
  }, [q, nameEntries]);

  const filteredLocs = useMemo(() => {
    if (!q) return locEntries;
    const stripped = stripLegalSuffix(q);
    return locEntries.filter(e =>
      fuzzySearch(e.searchText, q) ||
      fuzzySearch(e.searchText, stripped) ||
      e.searchText.includes(stripped)
    );
  }, [q, locEntries]);

  const selectName = (entry) => {
    setSearch(entry.store);
    setOpen(false);
    // Use onSelectStore if available — preserves address fields
    if (onSelectStore) {
      onSelectStore(entry.store);
    } else {
      onChange(entry.store);
    }
  };

  const selectLocation = (entry) => {
    setSearch(entry.label);
    setOpen(false);
    if (onSelectLocation) {
      onSelectLocation({
        store: entry.store,
        address: entry.address,
        zip_code: entry.zip_code,
        city: entry.city,
      });
    } else {
      onChange(entry.store);
    }
  };

  const hasResults = filteredNames.length > 0 || filteredLocs.length > 0;

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
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
