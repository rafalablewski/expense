// Correction Learning System — singleton module
// Learns from user corrections to product names and categories.

import { updateField } from '../firestore';

let _correctionsCache = { names: {}, categories: {} };
let _correctionsUid = null;

export function initCorrections(uid, data) {
  _correctionsUid = uid;
  _correctionsCache = data || { names: {}, categories: {} };
}

export function getCorrections() {
  return _correctionsCache;
}

export function saveCorrections(c) {
  _correctionsCache = c;
  if (_correctionsUid) updateField(_correctionsUid, "corrections", c);
}

export function learnFromCorrections(original, confirmed) {
  const corr = getCorrections();
  let changed = false;
  const origItems = original.items || [];
  const confItems = confirmed.items || [];
  const len = Math.min(origItems.length, confItems.length);
  for (let i = 0; i < len; i++) {
    const oi = origItems[i];
    const ci = confItems[i];
    // Learn name corrections — store as array of alternatives
    if (oi.name && ci.name && oi.name !== ci.name) {
      const key = oi.name.trim();
      const val = ci.name.trim();
      if (!corr.names[key]) corr.names[key] = [];
      if (Array.isArray(corr.names[key])) {
        if (!corr.names[key].includes(val)) corr.names[key].push(val);
      } else {
        // Migrate old string format to array
        const prev = corr.names[key];
        corr.names[key] = prev === val ? [val] : [prev, val];
      }
      changed = true;
    }
    // Learn category corrections (keyed by confirmed name lowercase)
    if (ci.name && oi.category !== ci.category) {
      corr.categories[ci.name.trim().toLowerCase()] = ci.category;
      changed = true;
    }
    if (oi.name && ci.name && oi.name !== ci.name && ci.category) {
      corr.categories[oi.name.trim().toLowerCase()] = ci.category;
    }
  }
  if (changed) saveCorrections(corr);
  return corr;
}

export function applyLearnedCorrections(parsed) {
  const corr = getCorrections();
  if (!parsed.items?.length) return parsed;
  const hasNames = Object.keys(corr.names).length > 0;
  const hasCats = Object.keys(corr.categories).length > 0;
  if (!hasNames && !hasCats) return parsed;
  return {
    ...parsed,
    items: parsed.items.map(it => {
      let name = it.name;
      let category = it.category;
      let _suggestions = null;
      // Check name corrections
      if (hasNames && name) {
        const corrections = corr.names[name.trim()];
        if (corrections) {
          const arr = Array.isArray(corrections) ? corrections : [corrections];
          if (arr.length === 1) {
            // Unambiguous — auto-apply
            name = arr[0];
          } else if (arr.length > 1) {
            // Ambiguous — mark for suggestion, don't auto-apply
            _suggestions = arr;
          }
        }
      }
      // Apply category correction
      const lookupKey = (name || "").trim().toLowerCase();
      if (hasCats && corr.categories[lookupKey]) {
        category = corr.categories[lookupKey];
      }
      return { ...it, name, category, _suggestions };
    }),
  };
}

export function getCorrectionStats() {
  const corr = getCorrections();
  return { names: Object.keys(corr.names).length, categories: Object.keys(corr.categories).length };
}
