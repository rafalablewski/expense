# Architecture

## Overview

MaszkaApp is an AI-powered expense tracking application built with React 18 + Vite 5 and Firebase (Auth + Firestore).

## Component Tree

```
<AuthGate>
  <ConfigProvider>          ← App config from Firestore (categories, stores, FX)
    <AppDataProvider>       ← User data + persistence (receipts, expenses, etc.)
      <App>
        <TopNav />
        <main>
          {view === "home"       && <DashboardView />}
          {view === "receipts"   && <ReceiptsView />}
          {view === "expenses"   && <ExpensesView />}
          {view === "stores"     && <StoresView />}
          {view === "shopping"   && <ShoppingView />}
          {view === "budgets"    && <BudgetsView />}
          {view === "recurring"  && <RecurringView />}
          {view === "stats"      && <StatsView />}
          {view === "inflation"  && <InflationView />}
          {view === "prediction" && <PredictionView />}
          {view === "mealplan"   && <MealPlanView />}
          {view === "export"     && <ExportView />}
        </main>
        <BottomNav />
        <Fab />
        <QuickAddExpense />
        <ReceiptReviewModal />
        <OnboardingOverlay />
        <ApiKeyModal />
      </App>
    </AppDataProvider>
  </ConfigProvider>
</AuthGate>
```

## Data Flow

1. **Authentication**: `AuthGate` handles login/register via Firebase Auth
2. **Config Loading**: `ConfigProvider` loads app configuration (categories, stores, FX rates) from Firestore `config/appConfig` with hardcoded fallbacks
3. **User Data**: `AppDataProvider` loads user data from Firestore `users/{uid}`, subscribes to real-time updates, and provides mutations
4. **Views**: Each view accesses data via `useAppData()` and `useConfig()` context hooks

## Folder Structure

```
src/
  App.jsx                    # Shell: routing + layout
  main.jsx                   # Entry: providers + CSS import
  styles/                    # All CSS files
  config/                    # Constants, theme, default values
  contexts/                  # React Context providers
  hooks/                     # Custom hooks
  services/                  # Firebase, Firestore, Claude API, localStorage
  utils/                     # Pure helper functions
  components/
    auth/                    # Authentication gate
    primitives/              # Zl, CatChip, Spinner, Empty, StorePickerInput
    charts/                  # DonutChart, BarChart, SparkLine, InsightCard
    modals/                  # ReceiptReviewModal, QuickAddExpense, Onboarding, ApiKey
    receipts/                # DropZone, ReceiptCard
    layout/                  # TopNav, BottomNav, Fab
  views/                     # All 13 page views
```

## State Management

Two React Contexts handle all app state:

### AppDataContext
- User-specific data: receipts, expenses, budgets, recurring, customStores
- UI state: view, currency, darkMode, onboarded, processing, errors
- Persistence: Firestore sync with real-time listener, localStorage backup
- Mutations: addExpense, handleFiles, guardedWrite

### ConfigContext
- App-level config loaded from Firestore: categories, categoryGroups, categoryIcons, defaultStores, fxRates, fxSymbols
- Loaded once on app start with hardcoded fallbacks for offline resilience

## AI Integration

- Receipt scanning via Anthropic Claude API (vision model)
- Text receipt parsing via Claude API
- Corrective learning system: user corrections to product names/categories are stored and applied to future scans
