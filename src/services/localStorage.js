// localStorage helpers for persistence and migration

export const LS_KEYS = {
  receipts: "maszka_receipts",
  expenses: "maszka_expenses",
  budgets: "maszka_budgets",
  recurring: "maszka_recurring",
  currency: "maszka_currency",
  darkMode: "maszka_darkMode",
  onboarded: "maszka_onboarded",
  apiKey: "maszka_apiKey",
  corrections: "maszka_corrections",
};

export function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

export function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
