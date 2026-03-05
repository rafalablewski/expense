import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const userRef = (uid) => doc(db, "users", uid);

const DEFAULTS = {
  receipts: [],
  expenses: [],
  budgets: {},
  recurring: [],
  currency: "PLN",
  darkMode: false,
  onboarded: false,
  corrections: { names: {}, categories: {} },
  customStores: [],
};

export async function loadUserData(uid) {
  const snap = await getDoc(userRef(uid));
  if (snap.exists()) {
    return { ...DEFAULTS, ...snap.data() };
  }
  return null;
}

export async function saveAllUserData(uid, data) {
  await setDoc(userRef(uid), data, { merge: true });
}

export async function updateField(uid, field, value) {
  try {
    await setDoc(userRef(uid), { [field]: value }, { merge: true });
  } catch (e) {
    console.error(`Firestore updateField(${field}) failed:`, e);
  }
}

/**
 * Subscribe to real-time updates for a user's document.
 * Returns an unsubscribe function.
 */
export function subscribeUserData(uid, callback) {
  return onSnapshot(userRef(uid), (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULTS, ...snap.data() });
    }
  }, (err) => {
    console.error("Firestore realtime listener error:", err);
  });
}

/**
 * Load app-level configuration from Firestore config/appConfig.
 * Returns null if the document doesn't exist.
 */
export async function loadAppConfig() {
  try {
    const snap = await getDoc(doc(db, "config", "appConfig"));
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.error("Failed to load app config:", e);
    return null;
  }
}
