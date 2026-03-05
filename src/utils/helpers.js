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

export const isRecurringPaused = (item) => {
  if (!item.paused) return false;
  if (item.pauseUntil) {
    return new Date().toISOString().slice(0, 10) < item.pauseUntil;
  }
  return true;
};
