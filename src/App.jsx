import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { loadUserData, saveAllUserData, updateField, subscribeUserData } from "./firestore";
import $ from "./config/theme";
import { CATS, DEFAULT_STORES, FX, FX_SYMBOLS } from "./config/defaults";
import { VIEWS } from "./config/constants";
import { LS_KEYS, lsGet, lsSet } from "./services/localStorage";
import { scanReceipt as scanReceiptAPI, parseTextReceipt as parseTextReceiptAPI, getCorrectionsHint } from "./services/claude";
import { initCorrections, getCorrections, saveCorrections, learnFromCorrections, applyLearnedCorrections } from "./hooks/useCorrections";
import { haptic } from "./utils/helpers";
import ReceiptReviewModal from "./components/modals/ReceiptReviewModal";
import OnboardingOverlay from "./components/modals/OnboardingOverlay";
import QuickAddExpense from "./components/modals/QuickAddExpense";
import ReceiptsView from "./views/ReceiptsView";
import ProductsView from "./views/ProductsView";
import ShoppingView from "./views/ShoppingView";
import MealPlanView from "./views/MealPlanView";
import StatsView from "./views/StatsView";
import StoresView from "./views/StoresView";
import ExportView from "./views/ExportView";
import BudgetsView from "./views/BudgetsView";
import RecurringView from "./views/RecurringView";
import DashboardView from "./views/DashboardView";
import InflationView from "./views/InflationView";
import PredictionView from "./views/PredictionView";
import ExpensesView from "./views/ExpensesView";
import TopNav from "./components/layout/TopNav";
import BottomNav from "./components/layout/BottomNav";
import Fab from "./components/layout/Fab";


export default function App({ uid }) {
  const [view,      setView]      = useState("home");
  const [receipts,  setReceipts]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [processing,setProcessing]= useState([]);
  const [errors,    setErrors]    = useState([]);
  const [budgets,   setBudgets]   = useState({});
  const [recurring, setRecurring] = useState([]);
  const [customStores, setCustomStores] = useState([]);
  const [currency,  setCurrency]  = useState("PLN");
  const [darkMode,  setDarkMode]  = useState(() => lsGet(LS_KEYS.darkMode, false));
  const [onboarded, setOnboarded] = useState(false);
  const [showQA,    setShowQA]    = useState(false);
  const [apiKey,    setApiKey]    = useState(() => lsGet(LS_KEYS.apiKey, ""));
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]); // receipts awaiting user approval
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pendingFilesRef = useRef(null);
  const pageRef = useRef();
  const initialLoadDone = useRef(false);
  const reviewQueueRef = useRef(reviewQueue);
  reviewQueueRef.current = reviewQueue;

  // Counter of in-flight local writes — when >0 we skip onSnapshot echoes
  const pendingWrites = useRef(0);

  // Load data from Firestore on mount, then subscribe to real-time updates
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;

        if (data === null) {
          // No Firestore data — migrate from localStorage
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
          // Verify migration succeeded before clearing localStorage
          const verify = await loadUserData(uid);
          if (verify && (verify.receipts || []).length >= (migrated.receipts || []).length) {
            Object.entries(LS_KEYS).forEach(([k, v]) => {
              if (k !== "apiKey") localStorage.removeItem(v);
            });
          }
          applyData(migrated);
        } else {
          // Check if localStorage has receipts that Firestore is missing (recovery)
          const lsReceipts = lsGet(LS_KEYS.receipts, []);
          if (lsReceipts.length > 0 && (data.receipts || []).length === 0) {
            data.receipts = lsReceipts;
            await saveAllUserData(uid, { receipts: lsReceipts });
          } else if (lsReceipts.length > 0) {
            // Merge any localStorage receipts not already in Firestore (by id)
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

        // Subscribe to real-time Firestore updates (cross-tab / cross-device sync)
        if (!cancelled) {
          unsubscribe = subscribeUserData(uid, (remoteData) => {
            // Skip echoes of our own local writes
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
    setReceipts(d.receipts || []);
    setExpenses(d.expenses || []);
    setBudgets(d.budgets || {});
    setRecurring(d.recurring || []);
    setCustomStores(d.customStores || []);
    setCurrency(d.currency || "PLN");
    setDarkMode(d.darkMode || false);
    setOnboarded(d.onboarded || false);
    initCorrections(uid, d.corrections);
  }

  // Persist to Firestore on change (skip initial load; NEVER write if load failed)
  useEffect(() => {
    if (dataLoaded && !loadFailed) initialLoadDone.current = true;
  }, [dataLoaded, loadFailed]);

  // Track previous values so we skip the redundant write-back that fires
  // in the same render cycle where data loads from Firestore.  Without this,
  // a stale "write loaded data back" can race with the user's first edit and
  // overwrite it, causing receipts to vanish on refresh.
  const prevReceipts  = useRef(null);
  const prevExpenses  = useRef(null);
  const prevBudgets   = useRef(null);
  const prevRecurring = useRef(null);
  const prevCurrency  = useRef(null);
  const prevDarkMode  = useRef(null);
  const prevOnboarded = useRef(null);

  // Write to Firestore while guarding against onSnapshot echo loops
  const guardedWrite = useCallback((field, value) => {
    pendingWrites.current++;
    updateField(uid, field, value).finally(() => {
      setTimeout(() => { pendingWrites.current = Math.max(0, pendingWrites.current - 1); }, 1500);
    });
  }, [uid]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      // Even before Firestore load completes (or if it fails), save non-empty
      // receipts to localStorage so they survive a refresh and can be recovered
      if (receipts.length > 0) lsSet(LS_KEYS.receipts, receipts);
      return;
    }
    if (prevReceipts.current === null) { prevReceipts.current = receipts; return; }
    prevReceipts.current = receipts;
    guardedWrite("receipts", receipts);
    lsSet(LS_KEYS.receipts, receipts);
  }, [receipts]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevExpenses.current === null) { prevExpenses.current = expenses; return; }
    prevExpenses.current = expenses;
    guardedWrite("expenses", expenses);
  }, [expenses]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevBudgets.current === null) { prevBudgets.current = budgets; return; }
    prevBudgets.current = budgets;
    guardedWrite("budgets", budgets);
  }, [budgets]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevRecurring.current === null) { prevRecurring.current = recurring; return; }
    prevRecurring.current = recurring;
    guardedWrite("recurring", recurring);
  }, [recurring]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    guardedWrite("customStores", customStores);
  }, [customStores]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevCurrency.current === null) { prevCurrency.current = currency; return; }
    prevCurrency.current = currency;
    guardedWrite("currency", currency);
  }, [currency]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevDarkMode.current === null) { prevDarkMode.current = darkMode; return; }
    prevDarkMode.current = darkMode;
    guardedWrite("darkMode", darkMode);
    lsSet(LS_KEYS.darkMode, darkMode);
  }, [darkMode]);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (prevOnboarded.current === null) { prevOnboarded.current = onboarded; return; }
    prevOnboarded.current = onboarded;
    guardedWrite("onboarded", onboarded);
  }, [onboarded]);

  // Unified allItems: manual expenses + receipt items
  const allItems = useMemo(() => [
    ...expenses.map(e => ({
      id: e.id, name: e.name, total_price: e.amount, category: e.category,
      date: e.date, store: e.store, note: e.note, source: "manual", type: e.type,
    })),
    ...receipts.flatMap(r =>
      (r.items || []).map(it => ({ ...it, store: r.store, address: r.address, zip_code: r.zip_code, date: r.date, source: "receipt" }))
    ),
  ], [expenses, receipts]);

  const addExpense = useCallback((exp) => {
    if (exp.type === "recurring") {
      setRecurring(r => [...r, { ...exp, amount: exp.amount, cycle: exp.cycle || "Miesięcznie" }]);
    } else {
      setExpenses(e => [exp, ...e]);
    }
  }, []);

  // Sync dark mode to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-dark", darkMode ? "1" : "0");
  }, [darkMode]);

  const processFiles = useCallback(async (files, key) => {
    for (const file of files) {
      const id = Date.now() + Math.random();
      setProcessing(p => [...p, { id, name: file.name }]);
      try {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const parsed = await scanReceiptAPI(b64, file.type, key, getCorrectionsHint(getCorrections()));
        const corrected = applyLearnedCorrections(parsed);
        // Enqueue for review instead of overwriting
        setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
        haptic(30);
      } catch (e) {
        setErrors(p => [...p, `${file.name}: ${e.message}`]);
      } finally {
        setProcessing(p => p.filter(x => x.id !== id));
      }
    }
  }, []);

  const handleFiles = useCallback(async files => {
    if (!apiKey) {
      pendingFilesRef.current = files;
      setShowKeyModal(true);
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

  const go = id => {
    setView(id);
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalItems = allItems.length;
  const currentView = VIEWS.find(v => v.id === view);

  if (!dataLoaded) return (
    <div className="loading-screen">
      <div>
        <div className="loading-icon">🧾</div>
        <div className="loading-text">Ładowanie danych...</div>
      </div>
    </div>
  );

  return (
    <>
      {/* CSS loaded via src/styles/index.css in main.jsx */}

      {/* Onboarding */}
      {!onboarded && <OnboardingOverlay onDone={() => { setOnboarded(true); haptic(30); }} darkMode={darkMode} />}

      {/* Quick Add Drawer */}
      {showQA && (
        <QuickAddExpense
          onAdd={addExpense}
          onClose={() => setShowQA(false)}
          apiKey={apiKey}
          onNeedKey={() => setShowKeyModal(true)}
          customStores={customStores}
          onAddCustomStore={s => { if (s && !customStores.includes(s) && !DEFAULT_STORES.includes(s)) setCustomStores(cs => [...cs, s]); }}
          onTextReceipt={async (text) => {
            setShowQA(false);
            const id = Date.now() + Math.random();
            setProcessing(p => [...p, { id, name: "Analiza tekstu..." }]);
            try {
              const parsed = await parseTextReceiptAPI(text, apiKey, getCorrectionsHint(getCorrections()));
              const corrected = applyLearnedCorrections(parsed);
              setReviewQueue(q => [...q, { ...corrected, id, _original: parsed }]);
              haptic(30);
            } catch (e) {
              setErrors(p => [...p, `Tekst: ${e.message}`]);
            } finally {
              setProcessing(p => p.filter(x => x.id !== id));
            }
          }}
        />
      )}

      {/* Receipt Review Modal — processes queue one at a time */}
      {reviewQueue.length > 0 && (
        <ReceiptReviewModal
          key={reviewQueue[0].id}
          receipt={reviewQueue[0]}
          onConfirm={(reviewed) => {
            const current = reviewQueueRef.current[0];
            if (current) {
              // Learn from user corrections vs original AI parse
              if (current._original) {
                learnFromCorrections(current._original, reviewed);
              }
              const { _original, ...rest } = current;
              setReceipts(p => [{ ...reviewed, id: rest.id }, ...p]);
            }
            setReviewQueue(q => q.slice(1));
            haptic(30);
          }}
          onCancel={() => setReviewQueue(q => q.slice(1))}
          customStores={customStores}
          onAddCustomStore={s => { if (s && !customStores.includes(s) && !DEFAULT_STORES.includes(s)) setCustomStores(cs => [...cs, s]); }}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="apikey-overlay"
          onClick={() => setShowKeyModal(false)}>
          <div className={`apikey-box ${darkMode ? "apikey-box-dark" : "apikey-box-light"}`}
            onClick={e => e.stopPropagation()}>
            <div className="apikey-title" style={{ color: darkMode ? "#fff" : $.ink0 }}>Klucz API Anthropic</div>
            <div className="apikey-desc" style={{ color: darkMode ? "#aaa" : $.ink2 }}>
              Wymagany do skanowania paragonów i planowania posiłków. Klucz jest przechowywany tylko lokalnie w przeglądarce.
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); lsSet(LS_KEYS.apiKey, e.target.value); }}
              placeholder="sk-ant-..."
              className={`apikey-input ${darkMode ? "apikey-input-dark" : "apikey-input-light"}`}
              onFocus={e => e.target.style.borderColor = $.green}
              onBlur={e => e.target.style.borderColor = darkMode ? "#333" : "#e0e0e0"}
            />
            <div className="apikey-actions">
              <button onClick={() => setShowKeyModal(false)}
                className="apikey-save">
                Zapisz
              </button>
            </div>
            {apiKey && <div className="apikey-status">Klucz ustawiony ({apiKey.slice(0,10)}...)</div>}
          </div>
        </div>
      )}

      {/* Skip link */}
      <a href="#main"
        className="skip-link"
      >Przejdź do treści</a>

      {/* ── TOP NAV ── */}
      <TopNav
        view={view} go={go} receipts={receipts} totalItems={totalItems}
        currency={currency} setCurrency={setCurrency}
        onAddExpense={() => setShowQA(true)} onApiKey={() => setShowKeyModal(true)}
        apiKey={apiKey} darkMode={darkMode} setDarkMode={setDarkMode} currentView={currentView}
      />

      {/* ── PAGE ── */}
      <main id="main" className="page" ref={pageRef}>
        {view === "receipts" && (
          <ReceiptsView
            receipts={receipts}
            setReceipts={setReceipts}
            processing={processing}
            errors={errors}
            setErrors={setErrors}
            onFiles={handleFiles}
          />
        )}
        {view === "home"      && <DashboardView receipts={receipts} expenses={expenses} budgets={budgets} recurring={recurring} currency={currency} go={go} allItems={allItems} />}
        {view === "expenses"  && <ExpensesView expenses={expenses} receipts={receipts} recurring={recurring} onDelete={id => setExpenses(e=>e.filter(x=>x.id!==id))} currency={currency} />}
        {view === "shopping"  && <ShoppingView receipts={receipts} />}
        {view === "stores"    && <StoresView receipts={receipts} expenses={expenses} />}
        {view === "budgets"   && <BudgetsView receipts={receipts} expenses={expenses} allItems={allItems} budgets={budgets} setBudgets={setBudgets} currency={currency} />}
        {view === "recurring" && <RecurringView recurring={recurring} setRecurring={setRecurring} currency={currency} />}
        {view === "stats"     && <StatsView receipts={receipts} expenses={expenses} allItems={allItems} currency={currency} />}
        {view === "inflation"  && <InflationView receipts={receipts} currency={currency} />}
        {view === "prediction" && <PredictionView receipts={receipts} currency={currency} />}
        {view === "mealplan"   && <MealPlanView receipts={receipts} apiKey={apiKey} />}
        {view === "export"     && <ExportView receipts={receipts} />}
      </main>

      {/* ── FAB ── */}
      <Fab onClick={() => setShowQA(true)} />

      {/* ── FLOATING PILL NAV (mobile) ── */}
      <BottomNav view={view} go={go} />
    </>
  );
}
