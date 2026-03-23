import { useState, useRef } from "react";
import { haptic } from "./utils/helpers";
import { useAppData } from "./contexts/AppDataContext";
import ReceiptReviewModal from "./components/modals/ReceiptReviewModal";
import BatchSelectModal from "./components/modals/BatchSelectModal";
import OnboardingOverlay from "./components/modals/OnboardingOverlay";
import QuickAddExpense from "./components/modals/QuickAddExpense";
import BulkReceiptsModal from "./components/modals/BulkReceiptsModal";
import ApiKeyModal from "./components/modals/ApiKeyModal";
import ReceiptsView from "./views/ReceiptsView";
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
    onboarded, setOnboarded,
    reviewQueue, setReviewQueue, dataLoaded,
    handleFiles, processTextReceipt, processJsonFiles, processSourceText,
    confirmReceipt, cancelReceipt,
    pendingReceipts, savePending, confirmPending, deletePending,
  } = useAppData();

  const [view,    setView]    = useState("home");
  const [showQA,  setShowQA]  = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [reviewingPendingId, setReviewingPendingId] = useState(null);
  const pageRef = useRef();

  const openManualEntry = () => {
    const id = Date.now() + Math.random();
    setReviewQueue(q => [...q, {
      id,
      source: "manual",
      store: "",
      address: "",
      zip_code: "",
      city: "",
      date: new Date().toISOString().slice(0, 10),
      total: 0,
      total_discounts: 0,
      delivery_cost: null,
      delivery_free: false,
      items: [{ name: "", quantity: 1, unit: null, unit_price: 0, total_price: 0, discount: null, discount_label: null, category: "Inne" }],
    }]);
  };

  const go = id => {
    setView(id);
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      {!onboarded && <OnboardingOverlay onDone={() => { setOnboarded(true); haptic(30); }} />}

      {showQA && (
        <QuickAddExpense
          onClose={() => setShowQA(false)}
          onManualEntry={() => openManualEntry()}
          onNavigate={go}
          onNeedKey={() => setShowKeyModal(true)}
          onTextReceipt={(text) => { setShowQA(false); processTextReceipt(text, () => setShowKeyModal(true)); }}
          onJsonImport={(files) => { processJsonFiles(files, () => setShowKeyModal(true)); }}
          onSourceImport={(source, files, text) => {
            if (files) processJsonFiles(files, () => setShowKeyModal(true), source);
            else if (text) processSourceText(source, text, () => setShowKeyModal(true));
          }}
          onBulkAdd={() => setShowBulk(true)}
        />
      )}

      {showBulk && (
        <BulkReceiptsModal
          onClose={(stagedReceipts) => {
            setShowBulk(false);
            if (stagedReceipts && stagedReceipts.length > 0) {
              // Add all staged receipts to review queue for individual confirmation
              const batchId = Date.now() + "_bulk";
              setReviewQueue(q => [
                ...q,
                ...stagedReceipts.map(r => ({
                  ...r,
                  _batchId: stagedReceipts.length > 1 ? batchId : null,
                })),
              ]);
            }
          }}
          onNeedKey={() => setShowKeyModal(true)}
        />
      )}

      {reviewQueue.length > 0 && (() => {
        const first = reviewQueue[0];
        const batchId = first._batchId;
        // Show batch selection when there are multiple receipts from the same parse
        if (batchId) {
          const batchItems = reviewQueue.filter(r => r._batchId === batchId);
          if (batchItems.length > 1) {
            return (
              <BatchSelectModal
                key={batchId}
                receipts={batchItems}
                onConfirm={(selectedIds) => {
                  // Remove unselected, clear _batchId on selected so they proceed to individual review
                  setReviewQueue(q => q
                    .filter(r => r._batchId !== batchId || selectedIds.has(r.id))
                    .map(r => r._batchId === batchId ? { ...r, _batchId: null } : r)
                  );
                }}
                onCancel={() => {
                  // Remove entire batch
                  setReviewQueue(q => q.filter(r => r._batchId !== batchId));
                }}
              />
            );
          }
        }
        return (
          <ReceiptReviewModal
            key={first.id}
            receipt={first}
            onConfirm={confirmReceipt}
            onCancel={cancelReceipt}
            onSavePending={(cleaned) => {
              const current = reviewQueue[0];
              savePending({ ...current, ...cleaned });
            }}
          />
        );
      })()}

      {reviewingPendingId && (() => {
        const pending = pendingReceipts.find(r => r.id === reviewingPendingId);
        if (!pending) return null;
        return (
          <ReceiptReviewModal
            key={`pending-${pending.id}`}
            receipt={pending}
            onConfirm={(reviewed) => {
              confirmPending(pending.id, reviewed);
              setReviewingPendingId(null);
            }}
            onCancel={() => setReviewingPendingId(null)}
          />
        );
      })()}

      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} />}

      <a href="#main" className="skip-link">Przejdź do treści</a>

      <TopNav
        view={view} go={go}
        onAddExpense={() => setShowQA(true)}
        onApiKey={() => setShowKeyModal(true)}
      />

      <main id="main" className="page" ref={pageRef}>
        {view === "receipts"   && <ReceiptsView
          onFiles={(files) => handleFiles(files, () => setShowKeyModal(true))}
          onManualEntry={() => openManualEntry()}
          onTextReceipt={(text) => processTextReceipt(text, () => setShowKeyModal(true))}
          onJsonImport={(files) => processJsonFiles(files, () => setShowKeyModal(true))}
          onSourceImport={(source, files, text) => {
            if (files) processJsonFiles(files, () => setShowKeyModal(true), source);
            else if (text) processSourceText(source, text, () => setShowKeyModal(true));
          }}
          onNeedKey={() => setShowKeyModal(true)}
          onReviewPending={(id) => setReviewingPendingId(id)}
        />}
        {view === "home"       && <DashboardView go={go} />}
        {view === "expenses"   && <ExpensesView />}
        {view === "shopping"   && <ShoppingView />}
        {view === "stores"     && <StoresView />}
        {view === "budgets"    && <BudgetsView />}
        {view === "recurring"  && <RecurringView />}
        {view === "stats"      && <StatsView />}
        {view === "inflation"  && <InflationView />}
        {view === "prediction" && <PredictionView />}
        {view === "mealplan"   && <MealPlanView onNeedKey={() => setShowKeyModal(true)} />}
        {view === "export"     && <ExportView />}
      </main>

      <Fab onClick={() => setShowQA(true)} />
      <BottomNav view={view} go={go} />
    </>
  );
}
