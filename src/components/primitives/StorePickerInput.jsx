import { useState, useRef, useMemo, useEffect } from 'react';
import { DEFAULT_STORES } from '../../config/defaults';

/**
 * StorePickerInput — shows store locations (name + address) as dropdown options.
 *
 * Props:
 *  - value: current store name string
 *  - onChange: called with store name string
 *  - onSelectLocation: called with { store, address, zip_code, city } when a saved location is picked
 *  - storeLocations: array of { store, label, address, zip_code, city }
 *  - customStores: array of store name strings (legacy)
 *  - onAddCustomStore: called with new store name string
 */
export default function StorePickerInput({ value, onChange, onSelectLocation, storeLocations = [], customStores = [], onAddCustomStore, id, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build combined list: saved locations first, then plain store names
  const entries = useMemo(() => {
    const result = [];
    const seen = new Set();

    // Store locations (with address data)
    for (const loc of storeLocations) {
      const key = `${loc.store}|${loc.address || ""}|${loc.city || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        type: "location",
        store: loc.store,
        label: loc.label || loc.store,
        address: loc.address || "",
        zip_code: loc.zip_code || "",
        city: loc.city || "",
        searchText: `${loc.store} ${loc.label || ""} ${loc.address || ""} ${loc.city || ""}`.toLowerCase(),
      });
    }

    // Plain store names (defaults + custom) without a location entry
    const allNames = [...new Set([...DEFAULT_STORES, ...(customStores || [])])];
    for (const name of allNames) {
      if (!result.some(e => e.store === name)) {
        result.push({
          type: "name",
          store: name,
          label: name,
          searchText: name.toLowerCase(),
        });
      }
    }

    return result;
  }, [storeLocations, customStores]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(e => e.searchText.includes(q));
  }, [search, entries]);

  const selectEntry = (entry) => {
    onChange(entry.store);
    setSearch(entry.type === "location" ? entry.label : entry.store);
    setOpen(false);
    if (entry.type === "location" && onSelectLocation) {
      onSelectLocation({
        store: entry.store,
        address: entry.address,
        zip_code: entry.zip_code,
        city: entry.city,
      });
    }
  };

  const selectNew = () => {
    if (onAddCustomStore) onAddCustomStore(search);
    onChange(search);
    setOpen(false);
  };

  return (
    <div ref={ref} className="store-picker">
      <input id={id} className="field" value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Wybierz lub wpisz sklep"}
        autoComplete="off" />
      {open && (
        <div className="store-picker-dropdown">
          {filtered.map((entry, i) => {
            const sub = entry.type === "location"
              ? [entry.address, entry.city].filter(Boolean).join(", ")
              : null;
            return (
              <div key={`${entry.type}-${entry.store}-${entry.address || i}`}
                onClick={() => selectEntry(entry)}
                className={`store-picker-option${entry.type === "location" ? " store-picker-option--loc" : ""}`}>
                <div className="store-picker-option-main">
                  <span className="store-picker-option-icon">
                    {entry.type === "location" ? "📍" : "🏪"}
                  </span>
                  <span className="store-picker-option-name">{entry.label}</span>
                </div>
                {sub && <div className="store-picker-option-sub">{sub}</div>}
              </div>
            );
          })}
          {search && !entries.some(e => e.store.toLowerCase() === search.toLowerCase() || e.label.toLowerCase() === search.toLowerCase()) && (
            <div onClick={selectNew} className="store-picker-add">
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
