// Pure helper functions shared across the application

import { FX } from '../config/defaults';

export function parseDate(str) {
  if (!str) return null;
  const m1 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m2 = str.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
  if (m1) return new Date(+m1[1], +m1[2]-1, +m1[3]);
  if (m2) return new Date(+m2[3], +m2[2]-1, +m2[1]);
  return null;
}

export function convertAmt(amt, currency) {
  const n = parseFloat(amt) || 0;
  return (n * (FX[currency] || 1)).toFixed(2);
}

export function haptic(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch(e) {}
}

// Total savings for a receipt: item discounts + free delivery cost + voucher
export function receiptSavings(receipt) {
  const discounts = parseFloat(receipt?.total_discounts) || 0;
  const freeDelivery = (receipt?.delivery_free && receipt?.delivery_cost) ? (parseFloat(receipt.delivery_cost) || 0) : 0;
  const voucher = parseFloat(receipt?.voucher) || 0;
  return discounts + freeDelivery + voucher;
}

export function sumReceiptItems(receipt) {
  const subtotal = receipt?.items?.length
    ? receipt.items.reduce((s, it) => s + (parseFloat(it.total_price) || 0), 0)
    : (parseFloat(receipt?.total) || 0);
  const delivery = receipt?.delivery_free ? 0 : (parseFloat(receipt?.delivery_cost) || 0);
  const voucher = parseFloat(receipt?.voucher) || 0;
  return subtotal + delivery - voucher;
}

export function toMonthly(item) {
  const a = parseFloat(item.amount) || 0;
  return ({ "Miesięcznie": a, "Tygodniowo": a * 4.33, "Rocznie": a / 12, "Kwartalnie": a / 3 })[item.cycle] || a;
}

export function buildReceiptNumberMap(receipts) {
  const sorted = [...receipts].sort((a, b) => {
    const cmp = (a.date || "").localeCompare(b.date || "");
    return cmp !== 0 ? cmp : (a.id || 0) - (b.id || 0);
  });
  const map = new Map();
  sorted.forEach((r, i) => map.set(r.id, i + 1));
  return map;
}

export const isRecurringPaused = (item) => {
  if (!item.paused) return false;
  if (item.pauseUntil) {
    return new Date().toISOString().slice(0, 10) < item.pauseUntil;
  }
  return true;
};
