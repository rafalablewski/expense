import { useState, useRef } from "react";
import $ from "./config/theme";
import { VIEWS } from "./config/constants";
import { LS_KEYS, lsSet } from "./services/localStorage";
import { haptic } from "./utils/helpers";
import { useAppData } from "./contexts/AppDataContext";
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


export default function App() {
  const {
    receipts, setReceipts,
    expenses,
    budgets, setBudgets,
    recurring, setRecurring,
    customStores,
    currency, setCurrency,
    darkMode, setDarkMode,
    onboarded, setOnboarded,
    apiKey, setApiKey,
    processing, errors, setErrors,
    reviewQueue,
    dataLoaded,
    allItems,
    addExpense,
    addCustomStore,
    deleteExpense,
    handleFiles,
    processTextReceipt,
    confirmReceipt,
    cancelReceipt,
  } = useAppData();

  const [view,    setView]    = useState("home");
  const [showQA,  setShowQA]  = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const pageRef = useRef();

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
          onAddCustomStore={addCustomStore}
          onTextReceipt={(text) => {
            setShowQA(false);
            processTextReceipt(text);
          }}
        />
      )}

      {/* Receipt Review Modal */}
      {reviewQueue.length > 0 && (
        <ReceiptReviewModal
          key={reviewQueue[0].id}
          receipt={reviewQueue[0]}
          onConfirm={confirmReceipt}
          onCancel={cancelReceipt}
          customStores={customStores}
          onAddCustomStore={addCustomStore}
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
      <a href="#main" className="skip-link">Przejdź do treści</a>

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
            onFiles={(files) => handleFiles(files, () => setShowKeyModal(true))}
          />
        )}
        {view === "home"      && <DashboardView receipts={receipts} expenses={expenses} budgets={budgets} recurring={recurring} currency={currency} go={go} allItems={allItems} />}
        {view === "expenses"  && <ExpensesView expenses={expenses} receipts={receipts} recurring={recurring} onDelete={deleteExpense} currency={currency} />}
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
