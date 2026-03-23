import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from "react";
import { loadUserData, saveAllUserData, updateField, subscribeUserData } from "../firestore";
import { DEFAULT_STORES, DEFAULT_STORE_LOCATIONS } from "../config/defaults";
import { LS_KEYS, lsGet, lsSet } from "../services/localStorage";
import { scanReceipt as scanReceiptAPI, parseTextReceipt as parseTextReceiptAPI, parseJsonReceipt as parseJsonReceiptAPI, getCorrectionsHint, compressImageIfNeeded } from "../services/claude";
import { initCorrections, getCorrections, learnFromCorrections, applyLearnedCorrections } from "../hooks/useCorrections";
import { haptic, sumReceiptItems, toMonthly } from "../utils/helpers";
import { matchStoreAddress, normalize, stripStreetPrefix, fuzzyStoreMatch } from "../utils/addressMatcher";

const AppDataContext = createContext(null);
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Extract city from Polish address like "Radockiego 150, 40-645 Katowice"
const extractCity = (addr) => {
  if (!addr) return null;
  const m = addr.match(/\d{2}-\d{3}\s+(.+)/);
  return m ? m[1].trim() : null;
};

// Ensure receipt has city populated (from explicit field or parsed from address)
const ensureCity = (receipt) => {
  if (receipt.city) return receipt;
  const city = extractCity(receipt.address);
  return city ? { ...receipt, city } : receipt;
};

// Trim whitespace from store-related fields so dedup keys always match
const trimLocationFields = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  for (const k of ["store", "label", "address", "zip_code", "city"]) {
    if (typeof out[k] === "string") out[k] = out[k].trim();
  }
  return out;
};

export function AppDataProvider({ uid, children }) {
  const [receipts,  setReceipts]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [budgets,   setBudgets]   = useState({});
  const [recurring, setRecurring] = useState([]);
  const [customStores, setCustomStores] = useState([]);
  const [storeLocations, setStoreLocations] = useState([]);
  const [currency,  setCurrency]  = useState("PLN");
  const [darkMode,  setDarkMode]  = useState(() => lsGet(LS_KEYS.darkMode, false));
  const [onboarded, setOnboarded] = useState(false);
  const [apiKey,    setApiKey]    = useState(() => lsGet(LS_KEYS.apiKey, ""));
  const [processing,setProcessing]= useState([]);
  const [errors,    setErrors]    = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const pendingFilesRef = useRef(null);
  const initialLoadDone = useRef(false);
  const reviewQueueRef = useRef(reviewQueue);
  reviewQueueRef.current = reviewQueue;
  const storeLocationsRef = useRef(storeLocations);
  storeLocationsRef.current = storeLocations;
  const pendingWrites = useRef(0);

  // ── Load data from Firestore on mount, subscribe to real-time updates ──
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;

        if (data === null) {
          const migrated = {
            receipts:    lsGet(LS_KEYS.receipts, []),
            expenses:    lsGet(LS_KEYS.expenses, []),
            budgets:     lsGet(LS_KEYS.budgets, {}),
            recurring:   lsGet(LS_KEYS.recurring, []),
            currency:    lsGet(LS_KEYS.currency, "PLN"),
            darkMode:    lsGet(LS_KEYS.darkMode, false),
            onboarded:   lsGet(LS_KEYS.onboarded, false),
            corrections: lsGet(LS_KEYS.corrections, { names: {}, categories: {} }),
          };
          await saveAllUserData(uid, migrated);
          const verify = await loadUserData(uid);
          if (verify && (verify.receipts || []).length >= (migrated.receipts || []).length) {
            Object.entries(LS_KEYS).forEach(([k, v]) => {
              if (k !== "apiKey") localStorage.removeItem(v);
            });
          }
          applyData(migrated);
        } else {
          const lsReceipts = lsGet(LS_KEYS.receipts, []);
          if (lsReceipts.length > 0 && (data.receipts || []).length === 0) {
            data.receipts = lsReceipts;
            await saveAllUserData(uid, { receipts: lsReceipts });
          } else if (lsReceipts.length > 0) {
            const existingIds = new Set((data.receipts || []).map(r => r.id));
            const missing = lsReceipts.filter(r => !existingIds.has(r.id));
            if (missing.length > 0) {
              data.receipts = [...missing, ...(data.receipts || [])];
              await saveAllUserData(uid, { receipts: data.receipts });
            }
          }
          applyData(data);
        }
        setDataLoaded(true);

        if (!cancelled) {
          unsubscribe = subscribeUserData(uid, (remoteData) => {
            if (pendingWrites.current > 0) return;
            applyData(remoteData);
          });
        }
      } catch (e) {
        console.error("Failed to load data from Firestore:", e);
        setErrors(["Nie udało się załadować danych. Odśwież stronę."]);
        setLoadFailed(true);
        setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [uid]);

  function applyData(d) {
    // Migrate old flat expenses into receipt format (one-time, on load)
    const oldExpenses = (d.expenses || []).filter(e => e.type !== "recurring");
    const migratedReceipts = oldExpenses.map(e => ensureCity({
      id: e.id,
      store: e.store || "",
      address: "",
      zip_code: "",
      city: e.city || "",
      date: e.date || "",
      total: parseFloat(e.amount) || 0,
      total_discounts: parseFloat(e.discount) || 0,
      source: "manual",
      items: [{
        name: e.name || "",
        quantity: e.quantity || 1,
        unit: e.unit || null,
        unit_price: e.unit_price || null,
        total_price: parseFloat(e.amount) || 0,
        discount: e.discount ? parseFloat(e.discount) : null,
        discount_label: e.discount_label || null,
        category: e.category || "Inne",
      }],
    }));
    const existingReceipts = (d.receipts || []).map(ensureCity);
    // Deduplicate: skip migrated receipts whose id already exists in receipts
    const existingIds = new Set(existingReceipts.map(r => r.id));
    const newMigrated = migratedReceipts.filter(r => !existingIds.has(r.id));
    let finalReceipts = [...existingReceipts, ...newMigrated];
    const rec = d.recurring || [];

    // One-time migration: move Netflix from receipts → recurring subscription
    const hasNetflixRecurring = rec.some(r => /netflix/i.test(r.name));
    if (!hasNetflixRecurring) {
      const netflixItems = [];
      finalReceipts = finalReceipts.map(r => {
        const nf = (r.items || []).filter(it => /netflix/i.test(it.name));
        const rest = (r.items || []).filter(it => !/netflix/i.test(it.name));
        if (nf.length > 0) {
          netflixItems.push(...nf);
          if (rest.length === 0) return null; // remove entire receipt
          return { ...r, items: rest, total: rest.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0) };
        }
        return r;
      }).filter(Boolean);
      if (netflixItems.length > 0) {
        const amt = netflixItems.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0);
        rec.push({ id: Date.now(), name: "Netflix", amount: amt, cycle: "Miesięcznie", category: "Subskrypcje", currency: "PLN" });
        // Persist the migration
        updateField(uid, "receipts", finalReceipts);
        updateField(uid, "recurring", rec);
      }
    }

    setReceipts(prev => deepEqual(prev, finalReceipts) ? prev : finalReceipts);
    setExpenses(prev => prev.length === 0 ? prev : []);
    setBudgets(prev => deepEqual(prev, d.budgets || {}) ? prev : (d.budgets || {}));
    setRecurring(prev => deepEqual(prev, rec) ? prev : rec);
    setCustomStores(prev => deepEqual(prev, d.customStores || []) ? prev : (d.customStores || []));
    setPendingReceipts(prev => deepEqual(prev, d.pendingReceipts || []) ? prev : (d.pendingReceipts || []));

    // Seed store locations from defaults + existing receipts + any already saved
    // Normalize dedup key: lowercase, collapse whitespace, strip Polish street prefixes
    const locKey = (l) => {
      const s = normalize(l.store);
      const z = normalize(l.zip_code);
      return z ? `${s}|${z}` : `${s}|${stripStreetPrefix(normalize(l.address))}|${normalize(l.city)}`;
    };
    const labelKey = (l) => l.label ? normalize(l.label) : "";
    // Deduplicate savedLocs themselves (merge entries with same key or same label)
    const dedupedSaved = [];
    const seenKeys = new Set();
    const seenLabels = new Set();
    for (const loc of (d.storeLocations || [])) {
      const key = locKey(loc);
      const lbl = labelKey(loc);
      if (seenKeys.has(key) || (lbl && seenLabels.has(lbl))) continue;
      seenKeys.add(key);
      if (lbl) seenLabels.add(lbl);
      dedupedSaved.push(loc);
    }
    const savedLocs = dedupedSaved;
    const newLocs = [];
    // Merge default store locations
    for (const loc of DEFAULT_STORE_LOCATIONS) {
      const key = locKey(loc);
      const lbl = labelKey(loc);
      if (seenKeys.has(key) || (lbl && seenLabels.has(lbl))) continue;
      seenKeys.add(key);
      if (lbl) seenLabels.add(lbl);
      newLocs.push(loc);
    }
    // Merge locations discovered from receipts (skip if already in defaults)
    const defaultKeys = new Set(DEFAULT_STORE_LOCATIONS.map(locKey));
    for (const r of finalReceipts) {
      if (!r.store || (!r.address && !r.city && !r.zip_code)) continue;
      const key = locKey(r);
      if (seenKeys.has(key) || defaultKeys.has(key)) continue;
      const shortAddr = r.city || (r.address ? r.address.split(",")[0].trim() : "");
      const lbl = (shortAddr ? `${r.store} ${shortAddr}` : r.store).toLowerCase().trim();
      if (seenLabels.has(lbl)) continue;
      seenKeys.add(key);
      seenLabels.add(lbl);
      newLocs.push({
        store: r.store,
        label: shortAddr ? `${r.store} ${shortAddr}` : r.store,
        address: r.address || "",
        zip_code: r.zip_code || "",
        city: r.city || "",
      });
    }
    const mergedLocs = [...savedLocs, ...newLocs];
    setStoreLocations(prev => deepEqual(prev, mergedLocs) ? prev : mergedLocs);
    // Persist if we discovered new locations or deduped existing ones
    const rawSavedLen = (d.storeLocations || []).length;
    if (newLocs.length > 0 || savedLocs.length < rawSavedLen) {
      updateField(uid, "storeLocations", mergedLocs);
    }
    setCurrency(prev => prev === (d.currency || "PLN") ? prev : (d.currency || "PLN"));
    setDarkMode(prev => prev === (d.darkMode || false) ? prev : (d.darkMode || false));
    setOnboarded(prev => prev === (d.onboarded || false) ? prev : (d.onboarded || false));
    initCorrections(uid, d.corrections);
  }

  // ── Persistence effects ──
  useEffect(() => {
    if (dataLoaded && !loadFailed) initialLoadDone.current = true;
  }, [dataLoaded, loadFailed]);

  const prevReceipts     = useRef(null);
  const prevExpenses     = useRef(null);
  const prevBudgets      = useRef(null);
  const prevRecurring    = useRef(null);
  const prevCustomStores = useRef(null);
  const prevCurrency     = useRef(null);
  const prevDarkMode     = useRef(null);
  const prevOnboarded    = useRef(null);

  const guardedWrite = useCallback((field, value) => {
    pendingWrites.current++;
    updateField(uid, field, value).finally(() => {
      setTimeout(() => { pendingWrites.current = Math.max(0, pendingWrites.current - 1); }, 1500);
    });
  }, [uid]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      if (receipts.length > 0) lsSet(LS_KEYS.receipts, receipts);
      return;
    }
    if (prevReceipts.current === null) { prevReceipts.current = receipts; return; }
    prevReceipts.current = receipts;
    guardedWrite("receipts", receipts);
    lsSet(LS_KEYS.receipts, receipts);
  }, [receipts, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevExpenses.current === null) { prevExpenses.current = expenses; return; }
    prevExpenses.current = expenses;
    guardedWrite("expenses", expenses);
  }, [expenses, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevBudgets.current === null) { prevBudgets.current = budgets; return; }
    prevBudgets.current = budgets;
    guardedWrite("budgets", budgets);
  }, [budgets, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) {
      if (recurring.length > 0) lsSet(LS_KEYS.recurring, recurring);
      return;
    }
    if (prevRecurring.current === null) { prevRecurring.current = recurring; return; }
    prevRecurring.current = recurring;
    guardedWrite("recurring", recurring);
    lsSet(LS_KEYS.recurring, recurring);
  }, [recurring, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevCustomStores.current === null) { prevCustomStores.current = customStores; return; }
    prevCustomStores.current = customStores;
    guardedWrite("customStores", customStores);
  }, [customStores, guardedWrite]);
  const prevStoreLocations = useRef(null);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevStoreLocations.current === null) { prevStoreLocations.current = storeLocations; return; }
    prevStoreLocations.current = storeLocations;
    guardedWrite("storeLocations", storeLocations);
  }, [storeLocations, guardedWrite]);
  const prevPendingReceipts = useRef(null);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevPendingReceipts.current === null) { prevPendingReceipts.current = pendingReceipts; return; }
    prevPendingReceipts.current = pendingReceipts;
    guardedWrite("pendingReceipts", pendingReceipts);
  }, [pendingReceipts, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevCurrency.current === null) { prevCurrency.current = currency; return; }
    prevCurrency.current = currency;
    guardedWrite("currency", currency);
  }, [currency, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevDarkMode.current === null) { prevDarkMode.current = darkMode; return; }
    prevDarkMode.current = darkMode;
    guardedWrite("darkMode", darkMode);
    lsSet(LS_KEYS.darkMode, darkMode);
  }, [darkMode, guardedWrite]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevOnboarded.current === null) { prevOnboarded.current = onboarded; return; }
    prevOnboarded.current = onboarded;
    guardedWrite("onboarded", onboarded);
  }, [onboarded, guardedWrite]);

  // ── Sync dark mode to DOM ──
  useEffect(() => {
    document.documentElement.setAttribute("data-dark", darkMode ? "1" : "0");
  }, [darkMode]);

  // ── Computed ──
  const allItems = useMemo(() => {
    // Receipt items (scanned + manual) are the single source of truth
    const receiptItems = receipts.flatMap(r => {
      const items = (r.items || []).map(it => ({ ...it, store: r.store, address: r.address, zip_code: r.zip_code, date: r.date, source: r.source || "receipt", receiptId: r.id }));
      // Inject delivery cost as a synthetic "Dostawa" category item for stats
      const deliveryCost = !r.delivery_free ? (parseFloat(r.delivery_cost) || 0) : 0;
      if (deliveryCost > 0) {
        items.push({ name: "Dostawa", quantity: 1, unit: null, unit_price: deliveryCost, total_price: deliveryCost, discount: null, discount_label: null, category: "Dostawa", store: r.store, address: r.address, zip_code: r.zip_code, date: r.date, source: r.source || "receipt" });
      }
      return items;
    });
    // Active recurring subscriptions as monthly items
    const recurringItems = recurring
      .filter(r => !r.paused || (r.pauseUntil && new Date().toISOString().slice(0, 10) >= r.pauseUntil))
      .map(r => ({
        id: r.id, name: r.name, total_price: toMonthly(r), category: r.category || "Subskrypcje",
        date: null, store: null, source: "recurring", cycle: r.cycle,
      }));
    return [...receiptItems, ...recurringItems];
  }, [receipts, recurring]);

  // ── Actions ──
  const addExpense = useCallback((exp) => {
    if (exp.type === "recurring") {
      setRecurring(r => [...r, { ...exp, amount: exp.amount, cycle: exp.cycle || "Miesięcznie" }]);
    } else {
      setExpenses(e => [exp, ...e]);
    }
  }, []);

  const addCustomStore = useCallback((s) => {
    if (s && !DEFAULT_STORES.includes(s)) {
      setCustomStores(cs => cs.includes(s) ? cs : [...cs, s]);
    }
  }, []);

  const processFiles = useCallback(async (files, key) => {
    for (const file of files) {
      const id = Date.now() + Math.random();
      setProcessing(p => [...p, { id, name: file.name }]);
      try {
        const rawB64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const { b64, mediaType } = await compressImageIfNeeded(rawB64, file.type);
        const parsed = trimLocationFields(await scanReceiptAPI(b64, mediaType, key, getCorrectionsHint(getCorrections())));
        const matched = matchStoreAddress(parsed, storeLocationsRef.current);
        const corrected = applyLearnedCorrections(matched);
        setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
        haptic(30);
      } catch (e) {
        setErrors(p => [...p, `${file.name}: ${e.message}`]);
      } finally {
        setProcessing(p => p.filter(x => x.id !== id));
      }
    }
  }, []);

  const handleFiles = useCallback(async (files, onNeedKey) => {
    if (!apiKey) {
      pendingFilesRef.current = files;
      onNeedKey();
      return;
    }
    processFiles(files, apiKey);
  }, [apiKey, processFiles]);

  useEffect(() => {
    if (apiKey && pendingFilesRef.current) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = null;
      processFiles(files, apiKey);
    }
  }, [apiKey, processFiles]);

  const processTextReceipt = useCallback(async (text, onNeedKey) => {
    if (!apiKey) {
      if (onNeedKey) onNeedKey();
      else setErrors(p => [...p, "Brak klucza API — ustaw go w ustawieniach (ikona klucza)"]);
      return;
    }
    const id = Date.now() + Math.random();
    setProcessing(p => [...p, { id, name: "Analiza tekstu..." }]);
    try {
      const rawParsed = await parseTextReceiptAPI(text, apiKey, getCorrectionsHint(getCorrections()));
      // AI may return an array of receipts (multiple orders) or a single object
      const receiptsArray = (Array.isArray(rawParsed) ? rawParsed : [rawParsed]).map(trimLocationFields);
      const batchId = receiptsArray.length > 1 ? Date.now() + "_batch" : null;
      for (let i = 0; i < receiptsArray.length; i++) {
        const receiptId = Date.now() + Math.random() + i;
        const matched = matchStoreAddress(receiptsArray[i], storeLocationsRef.current);
        const corrected = applyLearnedCorrections(matched);
        setReviewQueue(q => [...q, { ...corrected, id: receiptId, _original: receiptsArray[i], ...(batchId ? { _batchId: batchId } : {}) }]);
      }
      haptic(30);
    } catch (e) {
      setErrors(p => [...p, `Tekst: ${e.message}`]);
    } finally {
      setProcessing(p => p.filter(x => x.id !== id));
    }
  }, [apiKey]);

  const processJsonFiles = useCallback(async (files, onNeedKey, source = null) => {
    if (!apiKey) {
      if (onNeedKey) onNeedKey();
      else setErrors(p => [...p, "Brak klucza API — ustaw go w ustawieniach (ikona klucza)"]);
      return;
    }
    for (const file of files) {
      const id = Date.now() + Math.random();
      setProcessing(p => [...p, { id, name: file.name }]);
      try {
        const text = await file.text();
        const rawParsed = await parseJsonReceiptAPI(text, apiKey, source, getCorrectionsHint(getCorrections()));
        const receiptsArray = (Array.isArray(rawParsed) ? rawParsed : [rawParsed]).map(trimLocationFields);
        const batchId = receiptsArray.length > 1 ? Date.now() + "_batch" : null;
        for (let i = 0; i < receiptsArray.length; i++) {
          const receiptId = Date.now() + Math.random() + i;
          const matched = matchStoreAddress(receiptsArray[i], storeLocationsRef.current);
          const corrected = applyLearnedCorrections(matched);
          const sourceTag = source ? `import-${source}` : "import-json";
          setReviewQueue(q => [...q, { ...corrected, id: receiptId, source: sourceTag, _original: receiptsArray[i], ...(batchId ? { _batchId: batchId } : {}) }]);
        }
        haptic(30);
      } catch (e) {
        setErrors(p => [...p, `${file.name}: ${e.message}`]);
      } finally {
        setProcessing(p => p.filter(x => x.id !== id));
      }
    }
  }, [apiKey]);

  const processSourceText = useCallback(async (source, text, onNeedKey) => {
    if (!apiKey) {
      if (onNeedKey) onNeedKey();
      else setErrors(p => [...p, "Brak klucza API — ustaw go w ustawieniach (ikona klucza)"]);
      return;
    }
    const id = Date.now() + Math.random();
    setProcessing(p => [...p, { id, name: `${source} — analiza...` }]);
    try {
      // Try parsing as JSON first, fall back to text parsing with source hint
      let parsed;
      try {
        JSON.parse(text);
        parsed = await parseJsonReceiptAPI(text, apiKey, source, getCorrectionsHint(getCorrections()));
      } catch {
        parsed = await parseTextReceiptAPI(text, apiKey, getCorrectionsHint(getCorrections()));
      }
      const receiptsArray = (Array.isArray(parsed) ? parsed : [parsed]).map(trimLocationFields);
      const batchId = receiptsArray.length > 1 ? Date.now() + "_batch" : null;
      for (let i = 0; i < receiptsArray.length; i++) {
        const receiptId = Date.now() + Math.random() + i;
        const matched = matchStoreAddress(receiptsArray[i], storeLocationsRef.current);
        const corrected = applyLearnedCorrections(matched);
        setReviewQueue(q => [...q, { ...corrected, id: receiptId, source: `import-${source}`, _original: receiptsArray[i], ...(batchId ? { _batchId: batchId } : {}) }]);
      }
      haptic(30);
    } catch (e) {
      setErrors(p => [...p, `${source}: ${e.message}`]);
    } finally {
      setProcessing(p => p.filter(x => x.id !== id));
    }
  }, [apiKey]);

  const learnStoreLocation = useCallback((receipt) => {
    const { store, address, city, zip_code, _locationLabel } = receipt;
    if (!store || (!address && !city && !zip_code)) return;
    const a = (address || "").trim(), z = (zip_code || "").trim(), c = (city || "").trim();
    const nz = normalize(zip_code), na = stripStreetPrefix(normalize(address)), nc = normalize(city);

    // Use fuzzy matching to find canonical store name from existing locations
    const canonicalFromDefaults = DEFAULT_STORE_LOCATIONS.find(d => fuzzyStoreMatch(d.store, store));
    const s = canonicalFromDefaults ? canonicalFromDefaults.store : store.trim();

    // Skip if this location already exists in defaults
    const inDefaults = DEFAULT_STORE_LOCATIONS.some(d =>
      fuzzyStoreMatch(d.store, store) && (nz ? normalize(d.zip_code) === nz : normalize(d.city) === nc && stripStreetPrefix(normalize(d.address)) === na)
    );
    if (inDefaults) return;

    setStoreLocations(prev => {
      // Find canonical name from existing locations (fuzzy match)
      const canonicalFromPrev = prev.find(loc => fuzzyStoreMatch(loc.store, store));
      const finalStore = canonicalFromPrev ? canonicalFromPrev.store : s;
      const finalNs = normalize(finalStore);
      const key = nz ? `${finalNs}|${nz}` : `${finalNs}|${na}|${nc}`;

      // Use user-provided label, or auto-generate as fallback (branch name only, no store prefix)
      const autoLabel = c || (a ? a.split(",")[0].trim() : "");
      const finalLabel = (_locationLabel && _locationLabel.trim()) ? _locationLabel.trim() : autoLabel;

      const exists = prev.some(loc => {
        if (!fuzzyStoreMatch(loc.store, store)) return false;
        const lz = normalize(loc.zip_code);
        const locNs = normalize(loc.store);
        const locKey = lz ? `${locNs}|${lz}` : `${locNs}|${stripStreetPrefix(normalize(loc.address))}|${normalize(loc.city)}`;
        if (locKey === key) return true;
        if (loc.label && finalLabel && normalize(loc.label) === normalize(finalLabel)) return true;
        return false;
      });
      if (exists) return prev;
      return [...prev, { store: finalStore, label: finalLabel, address: a, zip_code: z, city: c }];
    });
  }, []);

  const confirmReceipt = useCallback((reviewed) => {
    const current = reviewQueueRef.current[0];
    if (current) {
      if (current._original) {
        learnFromCorrections(current._original, reviewed);
      }
      const { _original, _batchId, all_addresses: _allAddr, ...rest } = current;
      const { all_addresses: _allAddr2, _locationLabel, ...reviewedClean } = reviewed;
      const saved = trimLocationFields(ensureCity({ ...reviewedClean, id: rest.id }));
      // Preserve source from queue item (e.g. "manual" for hand-entered receipts)
      if (current.source) saved.source = current.source;
      saved.total = sumReceiptItems(saved);
      setReceipts(p => [saved, ...p]);
      // Auto-learn store location (pass _locationLabel for user-chosen branch name)
      learnStoreLocation({ ...saved, _locationLabel });
      // Add store name to custom stores list
      if (saved.store) addCustomStore(saved.store);
    }
    setReviewQueue(q => q.slice(1));
    haptic(30);
  }, [learnStoreLocation, addCustomStore]);

  const cancelReceipt = useCallback(() => {
    setReviewQueue(q => q.slice(1));
  }, []);

  const addStoreLocation = useCallback((loc) => {
    setStoreLocations(prev => [...prev, trimLocationFields(loc)]);
  }, []);

  const updateStoreLocation = useCallback((idx, loc) => {
    setStoreLocations(prev => prev.map((l, i) => i === idx ? trimLocationFields(loc) : l));
  }, []);

  const deleteStoreLocation = useCallback((idx) => {
    setStoreLocations(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const savePending = useCallback((receipt) => {
    const { _original, _batchId, _suggestions, ...clean } = receipt;
    const saved = trimLocationFields(ensureCity({
      ...clean,
      id: clean.id || Date.now() + Math.random(),
      savedAt: new Date().toISOString(),
    }));
    if (receipt.source) saved.source = receipt.source;
    saved.total = sumReceiptItems(saved);
    setPendingReceipts(p => [saved, ...p]);
    setReviewQueue(q => q.slice(1));
    haptic(30);
  }, []);

  const confirmPending = useCallback((id, reviewed) => {
    const pending = pendingReceipts.find(r => r.id === id);
    if (!pending) return;
    const { savedAt, _locationLabel, ...rest } = reviewed;
    const saved = trimLocationFields(ensureCity({ ...rest, id }));
    saved.total = sumReceiptItems(saved);
    setReceipts(p => [saved, ...p]);
    learnStoreLocation({ ...saved, _locationLabel });
    if (saved.store) addCustomStore(saved.store);
    setPendingReceipts(p => p.filter(r => r.id !== id));
    haptic(30);
  }, [pendingReceipts, learnStoreLocation, addCustomStore]);

  const deletePending = useCallback((id) => {
    setPendingReceipts(p => p.filter(r => r.id !== id));
  }, []);

  const updateReceipt = useCallback((updated) => {
    const synced = ensureCity({ ...updated, total: sumReceiptItems(updated) });
    setReceipts(p => p.map(r => r.id === synced.id ? synced : r));
  }, []);

  const updateExpense = useCallback((updated) => {
    setExpenses(e => e.map(x => x.id === updated.id ? updated : x));
  }, []);

  const deleteExpense = useCallback((id) => {
    setExpenses(e => e.filter(x => x.id !== id));
  }, []);

  const value = useMemo(() => ({
    // Data
    receipts, setReceipts,
    expenses,
    budgets, setBudgets,
    recurring, setRecurring,
    customStores,
    storeLocations,
    currency, setCurrency,
    darkMode, setDarkMode,
    onboarded, setOnboarded,
    apiKey, setApiKey,
    // Status
    processing, errors, setErrors,
    reviewQueue, setReviewQueue,
    dataLoaded, loadFailed,
    // Computed
    allItems,
    // Actions
    addExpense,
    addCustomStore,
    updateExpense,
    deleteExpense,
    updateReceipt,
    handleFiles,
    processTextReceipt,
    processJsonFiles,
    processSourceText,
    confirmReceipt,
    cancelReceipt,
    addStoreLocation,
    updateStoreLocation,
    deleteStoreLocation,
    pendingReceipts,
    savePending,
    confirmPending,
    deletePending,
  }), [
    receipts, expenses, budgets, recurring, customStores, storeLocations,
    currency, darkMode, onboarded, apiKey,
    processing, errors, reviewQueue, pendingReceipts,
    dataLoaded, loadFailed, allItems,
    addExpense, addCustomStore, updateExpense, deleteExpense, updateReceipt,
    handleFiles, processTextReceipt, processJsonFiles, processSourceText,
    confirmReceipt, cancelReceipt, savePending, confirmPending, deletePending,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
