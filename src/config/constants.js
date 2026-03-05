// Application constants — views, expense types, etc.

export const VIEWS = [
  { id: "home",       label: "Dashboard",   icon: "🏠", mobile: true  },
  { id: "receipts",   label: "Paragony",    icon: "🧾", mobile: true  },
  { id: "expenses",   label: "Wydatki",     icon: "💳", mobile: false },
  { id: "stores",     label: "Sklepy",      icon: "🏪", mobile: false },
  { id: "shopping",   label: "Lista",       icon: "🛒", mobile: true  },
  { id: "budgets",    label: "Budżety",     icon: "💰", mobile: true  },
  { id: "recurring",  label: "Cykliczne",   icon: "🔄", mobile: false },
  { id: "stats",      label: "Statystyki",  icon: "📊", mobile: true  },
  { id: "inflation",  label: "Inflacja",    icon: "📈", mobile: false },
  { id: "prediction", label: "Predykcja",   icon: "🔮", mobile: false },
  { id: "mealplan",   label: "Planner",     icon: "🗓️", mobile: false },
  { id: "export",     label: "Eksport",     icon: "⬇️", mobile: false },
];

export const MOBILE_VIEWS = VIEWS.filter(v => v.mobile);

export const EXPENSE_TYPES = [
  { id: "one-time",  label: "Jednorazowy",  icon: "🛒", sub: "zakup, sprzęt, usługa" },
  { id: "recurring", label: "Cykliczny",    icon: "🔄", sub: "subskrypcja, abonament" },
];
