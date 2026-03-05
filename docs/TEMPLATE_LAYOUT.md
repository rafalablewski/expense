# Template & Layout

## Page Structure

Every page follows this layout:

```
┌─────────────────────────────────────┐
│ TopNav (fixed, black, 56px)         │
│  Logo · Nav links · Dark/Currency   │
├─────────────────────────────────────┤
│                                     │
│ Page Hero                           │
│  Title + Subtitle                   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Container (max-width: 820px)        │
│  └─ Section                         │
│      └─ Content (cards, grids)      │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ BottomNav (mobile only, fixed)      │
│  Home · Receipts · + · Budget · Stats│
└─────────────────────────────────────┘
```

## Responsive Breakpoints

- **Desktop** (>768px): Full top navigation with all links, no bottom nav
- **Mobile** (<=768px): Hamburger-less bottom pill nav with 5 key views, FAB for quick add

## Views

| View | Route Key | Mobile Nav | Description |
|------|-----------|------------|-------------|
| Dashboard | `home` | Yes | Monthly overview, budget alerts, savings tips |
| Receipts | `receipts` | Yes | Receipt scanning, gallery, AI processing |
| Expenses | `expenses` | No | Combined view of all expense sources |
| Stores | `stores` | No | Store analytics and comparison |
| Shopping | `shopping` | No | Shopping list management |
| Budgets | `budgets` | Yes | Category budget management |
| Recurring | `recurring` | No | Subscription tracking |
| Stats | `stats` | Yes | Full statistics with charts and insights |
| Inflation | `inflation` | No | Price trend analysis |
| Prediction | `prediction` | No | Spending forecast |
| Meal Plan | `mealplan` | No | AI meal planning |
| Export | `export` | No | CSV data export |

## Design Language

- Glass morphism cards with backdrop blur
- Green accent (#06C167) throughout
- Animated page transitions (fadeUp)
- Gradient background (fixed, multi-radial)
