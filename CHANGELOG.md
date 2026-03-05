# Changelog

All notable changes to MaszkaApp will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Stats page filters: category groups (Spożywcze/Rachunki/Jednorazowe) and shop filter
- Manual expenses now included in all statistics calculations
- Project documentation (ARCHITECTURE.md, STYLING_GUIDE.md, TEMPLATE_LAYOUT.md, FIRESTORE_SCHEMA.md)
- CHANGELOG.md for tracking development progress
- ConfigContext for dynamic Firestore configuration (categories, stores, FX rates)

### Changed
- **Phase 0-1**: Extracted all CSS from inline `<style>` template literal into 7 modular .css files (variables, reset, dark-mode, layout, components, modals, views)
- **Phase 2**: Extracted utilities, services, and config into separate modules (localStorage, claude, constants, theme, defaults, helpers)
- **Phase 3**: Extracted 11 leaf components into proper file hierarchy:
  - Primitives: Zl, CatChip, Spinner, Empty, StorePickerInput
  - Charts: DonutChart, BarChart, SparkLine, InsightCard
  - Receipts: DropZone, ReceiptCard
- **Phase 4**: Converted 430+ inline `style={{}}` to CSS classes (from 510+ down to ~76 remaining dynamic styles)
  - Added 150+ CSS classes across views.css for stats, stores, meals, shopping, budget, prediction, expenses, dashboard
  - Fixed 50+ duplicate className JSX attributes
- **Phase 5**: Extracted modal components (ReceiptReviewModal, OnboardingOverlay, QuickAddExpense)
- **Phase 7**: Added ConfigContext for dynamic Firestore configuration with offline fallbacks
- **Phase 8**: Extracted 13 view components to src/views/:
  - ReceiptsView, ProductsView, ShoppingView, MealPlanView, StatsView, StoresView
  - ExportView, BudgetsView, RecurringView, DashboardView, InflationView, PredictionView, ExpensesView
- **Phase 9**: Extracted layout components (TopNav, BottomNav, Fab) to src/components/layout/
- App.jsx reduced from 5,936 lines to 433 lines (92.7% reduction)

### Fixed
- Stats page now includes manual expenses in totals, averages, and monthly chart
