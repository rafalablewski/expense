import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
    await updateDoc(userRef(uid), { [field]: value });
  } catch (e) {
    console.error(`Firestore updateField(${field}) failed:`, e);
  }
}
