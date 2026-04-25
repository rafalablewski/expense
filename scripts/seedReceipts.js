/**
 * Seed script to populate a user's `receipts` array in Firestore
 * with the 26 paragons collected April 2026.
 *
 * The data lives in src/data/seedReceipts.js so the in-app banner
 * (SeedReceiptsBanner) and this script share a single source of truth.
 *
 * Usage:
 *   node scripts/seedReceipts.js               # prints JSON to stdout
 *   node scripts/seedReceipts.js > seed.json   # save for inspection / UI import
 *
 * To write directly to Firestore:
 *   1. npm i -D firebase-admin
 *   2. Place a service-account key at scripts/serviceAccount.json (gitignored)
 *   3. UID=<your-firebase-uid> node scripts/seedReceipts.js --write
 */

import { SEED_RECEIPTS } from "../src/data/seedReceipts.js";

const expected = {
  1: 3.60, 2: 4.00, 3: 78.00, 4: 23.80, 5: 7.49, 6: 15.49, 7: 11.68, 8: 12.99,
  9: 5.07, 10: 85.77, 11: 24.87, 12: 2.10, 13: 27.39, 14: 25.32, 15: 7.80,
  16: 8.58, 17: 9.52, 18: 6.08, 19: 3.57, 20: 199.39, 21: 37.30, 22: 22.88,
  23: 3.85, 24: 8.53, 25: 6.92, 26: 33.19,
};
const mismatches = SEED_RECEIPTS
  .map((rc, idx) => [idx + 1, rc.total, expected[idx + 1]])
  .filter(([, got, want]) => Math.abs(got - want) > 0.005);
if (mismatches.length) {
  console.error("Total mismatch on receipts:", mismatches);
  process.exit(1);
}
const grand = +SEED_RECEIPTS.reduce((s, rc) => s + rc.total, 0).toFixed(2);
console.error(`Validated ${SEED_RECEIPTS.length} receipts, sum = ${grand} PLN (expected 675.18)`);

const writeFlag = process.argv.includes("--write");
if (!writeFlag) {
  console.log(JSON.stringify(SEED_RECEIPTS, null, 2));
  process.exit(0);
}

const uid = process.env.UID;
if (!uid) {
  console.error("Missing UID env var. Example: UID=abc123 node scripts/seedReceipts.js --write");
  process.exit(1);
}
let admin;
try {
  admin = (await import("firebase-admin")).default;
} catch {
  console.error("firebase-admin not installed. Run: npm i -D firebase-admin");
  process.exit(1);
}
const { readFileSync } = await import("node:fs");
const keyPath = new URL("./serviceAccount.json", import.meta.url);
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const ref = db.collection("users").doc(uid);
const snap = await ref.get();
const existing = (snap.exists && snap.data().receipts) || [];
const existingIds = new Set(existing.map(r => r.id));
const missing = SEED_RECEIPTS.filter(r => !existingIds.has(r.id));
if (!missing.length) {
  console.error(`All ${SEED_RECEIPTS.length} seed receipts already present on users/${uid}.`);
  process.exit(0);
}
await ref.set({ receipts: [...existing, ...missing] }, { merge: true });
console.error(`Appended ${missing.length} receipts to users/${uid} (was ${existing.length}, now ${existing.length + missing.length}).`);
