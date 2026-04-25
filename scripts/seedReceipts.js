/**
 * Seed script to populate a user's `receipts` array in Firestore
 * with 26 paragons collected April 2026.
 *
 * Usage:
 *   node scripts/seedReceipts.js               # prints JSON to stdout
 *   node scripts/seedReceipts.js > seed.json   # save for inspection / UI import
 *
 * To write directly to Firestore:
 *   1. npm i -D firebase-admin
 *   2. Place a service-account key at scripts/serviceAccount.json (gitignored)
 *   3. UID=<your-firebase-uid> node scripts/seedReceipts.js --write
 *
 * The schema mirrors src/contexts/AppDataContext.jsx and docs/FIRESTORE_SCHEMA.md.
 */

const BASE_ID = 1745580000000;

const r = (i, meta, items, extras = {}) => {
  const total_discounts = +items.reduce((s, it) => s + (it.discount || 0), 0).toFixed(2);
  const items_total = +items.reduce((s, it) => s + it.total_price, 0).toFixed(2);
  const voucher = extras.voucher || 0;
  const total = +(items_total - voucher).toFixed(2);
  return {
    id: BASE_ID + i,
    source: "receipt",
    ...meta,
    items,
    total,
    total_discounts,
    voucher: voucher || null,
    delivery_cost: null,
    delivery_free: false,
  };
};

const item = (name, category, quantity, unit_price, total_price, discount = null, unit = "szt", discount_label = null) => ({
  name, category, quantity, unit, unit_price, total_price, discount, discount_label,
});

const KATOWICE = { city: "Katowice" };
const MIKOLOW = { city: "Mikołów" };

const BIEDRONKA_RADOCKIEGO = { store: "Biedronka", address: "ul. Radockiego 150", zip_code: "40-645", ...KATOWICE };
const LIDL_SZARYCH = { store: "Lidl", address: "ul. Szarych Szeregów 3A", zip_code: "40-750", ...KATOWICE };
const LIDL_PODLESKA = { store: "Lidl", address: "ul. Podleska 14e", zip_code: "43-190", ...MIKOLOW };
const NETTO_AK = { store: "Netto", address: "ul. Armii Krajowej 208", zip_code: "40-750", ...KATOWICE };
const KLOS = { store: "Kłos Piekarnia Rodzinna", address: "ul. Biedronek 2", zip_code: "40-645", ...KATOWICE };
const ROSSMANN_KOSCIUSZKI = { store: "Rossmann", address: "ul. Kościuszki 229", zip_code: "40-600", ...KATOWICE };
const ROSSMANN_BAZANTOW = { store: "Rossmann", address: "ul. Bażantów 6 c/1e", zip_code: "40-668", ...KATOWICE };
const WYGORZELE = { store: "F.H.H Wygorzele", address: "ul. Bażantów 6C", zip_code: "40-668", ...KATOWICE };
const AUCHAN_MIKOLOW = { store: "Auchan", address: "ul. Gliwicka 3", zip_code: "43-190", ...MIKOLOW };

const receipts = [
  // #1 — Kłos Piekarnia
  r(1, { ...KLOS, date: "2026-04-23" }, [
    item("Bułka maślana bez maku", "Pieczywo", 1, 1.80, 1.80),
    item("Bułka maślana bez maku", "Pieczywo", 1, 1.80, 1.80),
  ]),

  // #2 — Galeria Katowicka parking
  r(2, { store: "Galeria Katowicka — Parking", city: "Katowice", date: "2026-04-25" }, [
    item("Parking", "Transport", 1, 4.00, 4.00),
  ]),

  // #3 — Pizza
  r(3, { store: "Pizza prosto z Pieca", date: "2026-04-25" }, [
    item("Pizza Margherita", "Restauracje", 1, 32.00, 32.00),
    item("Pizza Cotto", "Restauracje", 1, 46.00, 46.00),
  ]),

  // #4 — Biedronka
  r(4, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-23" }, [
    item("Ser Grill Delikatesowy 200g", "Nabiał", 1, 8.49, 8.49),
    item("Serek Wiejski 200g", "Nabiał", 2, 2.99, 4.98, 1.00),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Avokado", "Owoce", 2, 6.49, 6.48, 6.50),
  ]),

  // #5 — Biedronka
  r(5, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-22" }, [
    item("Pierogi z serem 400g", "Zboża", 1, 7.49, 7.49),
  ]),

  // #6 — Rossmann
  r(6, { ...ROSSMANN_KOSCIUSZKI, date: "2026-04-22" }, [
    item("Vope żel pod prysznic", "Kosmetyki", 1, 18.99, 15.49, 3.50),
  ]),

  // #7 — Biedronka, butelki zwrotne (bon)
  r(7, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-09" }, [
    item("Muszyna-Skarb 1,5 l", "Napoje", 12, 1.89, 22.68),
  ], { voucher: 11.00 }),

  // #8 — Biedronka
  r(8, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-21" }, [
    item("Pomidory Malinowe Polska 500g", "Warzywa", 1, 12.99, 12.99),
  ]),

  // #9 — Rossmann
  r(9, { ...ROSSMANN_BAZANTOW, date: "2026-04-10" }, [
    item("Isana żel pod prysznic", "Kosmetyki", 3, 2.19, 5.07, 1.50),
  ]),

  // #10 — Lidl
  r(10, { ...LIDL_SZARYCH, date: "2026-04-22" }, [
    item("Granat luz", "Owoce", 0.704, 19.99, 8.44, 5.63, "kg"),
    item("Winogrona jasne bezpestkowe", "Owoce", 0.59, 19.99, 7.07, 4.72, "kg"),
    item("Pomidory kiściowe luz", "Warzywa", 0.608, 14.99, 5.47, 3.64, "kg"),
    item("Buraki czerwone luz", "Warzywa", 1.202, 2.49, 1.79, 1.20, "kg"),
    item("Bataty luz", "Warzywa", 0.866, 11.99, 8.82, 1.56, "kg"),
    item("Bio Napój sojowy", "Napoje", 2, 4.99, 8.98, 1.00),
    item("Czosnek luz", "Warzywa", 0.098, 19.90, 1.95, null, "kg"),
    item("Cytryny 750g", "Owoce", 1, 7.99, 7.99),
    item("Papryka mix 500g", "Warzywa", 1, 6.99, 6.99),
    item("Szpinak rozdrobniony", "Warzywa", 1, 3.45, 3.45),
    item("Papier toaletowy 2w.", "Chemia", 1, 6.49, 6.49),
    item("Śmietanka 30% 330g", "Nabiał", 1, 5.49, 5.49),
    item("Rzodkiewki pęczek", "Warzywa", 1, 2.99, 2.99),
    item("Cebula czerwona luz", "Warzywa", 0.384, 5.49, 2.11, null, "kg"),
    item("Rukola", "Warzywa", 1, 4.99, 4.99),
    item("Płatki owsiane górskie", "Zboża", 1, 2.75, 2.75),
  ]),

  // #11 — Netto
  r(11, { ...NETTO_AK, date: "2026-04-22" }, [
    item("Woda kokosowa 320 ml", "Napoje", 3, 5.09, 15.27),
    item("Smoothie jabłko-pomarańcza-mango 1 l", "Napoje", 1, 4.80, 4.80),
    item("Smoothie jabłko-truskawka-marakuja 1 l", "Napoje", 1, 4.80, 4.80),
  ]),

  // #12 — Wygorzele
  r(12, { ...WYGORZELE, date: "2026-04-10" }, [
    item("Bułka graham z ziarnami 80g", "Pieczywo", 1, 2.10, 2.10),
  ]),

  // #13 — Lidl
  r(13, { ...LIDL_SZARYCH, date: "2026-04-09" }, [
    item("Banany luz", "Owoce", 1.474, 6.99, 4.41, 5.89, "kg"),
    item("Pinsa pełnoziarnista", "Pieczywo", 1, 11.99, 11.99),
    item("Ser cheddar wiórki", "Nabiał", 1, 10.99, 10.99),
  ]),

  // #14 — Netto
  r(14, { ...NETTO_AK, date: "2026-04-09" }, [
    item("Baton owocowy 35g", "Słodycze", 1, 1.77, 1.77),
    item("Tortilla pszenna 250g", "Pieczywo", 2, 3.79, 7.58),
    item("Jabłka luz", "Owoce", 0.410, 5.19, 1.43, 0.70, "kg"),
    item("Cukinia luz", "Warzywa", 1.455, 16.99, 14.54, 10.18, "kg"),
  ]),

  // #15 — Kłos Piekarnia
  r(15, { ...KLOS, date: "2026-04-21" }, [
    item("Chleb Staropolski", "Pieczywo", 1, 7.80, 7.80),
  ]),

  // #16 — Netto, +kaucja ALU 0,50
  r(16, { ...NETTO_AK, date: "2026-04-03" }, [
    item("Dr. Witt 550 ml", "Napoje", 1, 2.99, 2.99),
    item("Coconaut 320 ml", "Napoje", 1, 5.09, 5.09),
    item("Kaucja ALU", "Inne", 1, 0.50, 0.50),
  ]),

  // #17 — Lidl Mikołów
  r(17, { ...LIDL_PODLESKA, date: "2026-04-07" }, [
    item("Solone Paprykachipsy", "Słodycze", 1, 4.94, 4.94),
    item("Serek wiejski", "Nabiał", 2, 2.29, 4.58),
  ]),

  // #18 — Lidl Mikołów
  r(18, { ...LIDL_PODLESKA, date: "2026-04-07" }, [
    item("Bułka z ziarnami", "Pieczywo", 2, 1.35, 2.42, 0.28),
    item("Bułka orkiszowa 60%", "Pieczywo", 1, 1.67, 1.67),
    item("Czosnek młody szt.", "Warzywa", 1, 1.99, 1.99),
  ]),

  // #19 — Biedronka
  r(19, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-07" }, [
    item("Bułka żytnia 55g", "Pieczywo", 3, 1.19, 3.57),
  ]),

  // #20 — Auchan Mikołów, +kaucja butelki 6,00
  r(20, { ...AUCHAN_MIKOLOW, date: "2026-04-03" }, [
    item("Woda NG SK", "Napoje", 2, 11.28, 22.56),
    item("Woda NG 6l", "Napoje", 2, 19.68, 39.36),
    item("Coconut Mi", "Napoje", 4, 4.99, 19.96),
    item("Chili w płacie", "Warzywa", 1, 1.98, 1.98),
    item("Chili chip", "Warzywa", 1, 1.98, 1.98),
    item("Fasola czarna", "Warzywa", 3, 3.68, 11.04),
    item("Cieciorka", "Warzywa", 3, 3.68, 11.04),
    item("Cieciorka", "Warzywa", 1, 3.68, 3.68),
    item("Pomidory S", "Warzywa", 1, 7.48, 7.48),
    item("Bułka pszenna", "Pieczywo", 2, 1.89, 3.78),
    item("Mąka orkiszowa", "Zboża", 1, 5.29, 5.29),
    item("Cebula czerwona", "Warzywa", 0.260, 4.49, 1.17, null, "kg"),
    item("Pierogi Z", "Zboża", 1, 8.99, 8.99),
    item("Diet sok Z", "Napoje", 2, 7.19, 14.38),
    item("Ser Jantar", "Nabiał", 1, 12.39, 12.39),
    item("Soczewica", "Warzywa", 1, 7.78, 7.78),
    item("Papryka Jal", "Warzywa", 1, 7.79, 7.79),
    item("Śmietanka", "Nabiał", 2, 4.49, 6.80, 2.18),
    item("Popcorn", "Słodycze", 3, 1.98, 5.94),
    item("Kaucja butelki zwrotne", "Inne", 2, 3.00, 6.00),
  ]),

  // #21 — Biedronka
  r(21, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-02" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Masło Extra Mlekovita Dolina 200g", "Nabiał", 1, 4.99, 0.99, 4.00),
    item("Masło Extra Mlekovita Dolina 200g", "Nabiał", 1, 4.99, 0.99, 4.00),
    item("Masło Extra Mlekovita Dolina 200g", "Nabiał", 1, 4.99, 0.99, 4.00),
    item("Szczypiorek/Natka", "Warzywa", 1, 2.99, 1.99, 1.00),
    item("Pietruszka Natka XL szt", "Warzywa", 1, 6.49, 4.32, 2.17),
    item("Koper natka xl szt", "Warzywa", 1, 6.49, 4.32, 2.17),
    item("Kapary El Toro 100 60g", "Warzywa", 1, 3.49, 2.49, 1.00),
    item("Kapary El Toro 100 60g", "Warzywa", 1, 3.49, 2.49, 1.00),
    item("Kapary El Toro 100 60g", "Warzywa", 1, 3.49, 2.49, 1.00),
    item("Kapary El Toro 100 60g", "Warzywa", 1, 3.49, 2.49, 1.00),
    item("Czosnek Młody szt", "Warzywa", 2, 1.99, 1.98, 2.00),
    item("Imbir luz", "Warzywa", 0.075, 24.90, 1.87, null, "kg"),
    item("Papryczka Chilli szt", "Warzywa", 1, 1.29, 1.29),
    item("Banan luz", "Owoce", 1.590, 6.99, 4.75, 6.36, "kg"),
  ]),

  // #22 — Biedronka
  r(22, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-04" }, [
    item("Roszponka Myta VF 100g", "Warzywa", 1, 5.99, 5.99),
    item("Kefir Krasnystaw 420g", "Nabiał", 1, 2.89, 2.89),
    item("Śliwka luz", "Owoce", 0.365, 11.99, 4.38, null, "kg"),
    item("Cebula żółta luz", "Warzywa", 0.410, 3.49, 1.43, null, "kg"),
    item("Pomidor malinowy Polska luz", "Warzywa", 0.455, 24.99, 8.19, 3.18, "kg"),
  ]),

  // #23 — Biedronka
  r(23, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
  ]),

  // #24 — Biedronka
  r(24, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Chipsy Top Solone 150g", "Słodycze", 1, 4.95, 4.95),
    item("Jogurt Naturalny 400g", "Nabiał", 1, 1.79, 1.79),
    item("Jogurt Naturalny 400g", "Nabiał", 1, 1.79, 1.79),
  ]),

  // #25 — Biedronka
  r(25, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Pomidor malinowy Polska luz", "Warzywa", 0.41, 24.99, 6.92, 3.33, "kg"),
  ]),

  // #26 — Biedronka
  r(26, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-21" }, [
    item("Passata z ziół 700g", "Warzywa", 1, 6.75, 6.75),
    item("Koncentrat Pomidor Dawtona 190g", "Warzywa", 1, 3.45, 3.45),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 2.99),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 2.99),
    item("Mozzarella Light 125g", "Nabiał", 1, 2.99, 2.99),
    item("Serek Wiejski bez laktozy 200g", "Nabiał", 1, 2.99, 2.99),
    item("Serek Wiejski bez laktozy 200g", "Nabiał", 1, 2.99, 2.99),
    item("Hummus Klasyczny 160g", "Inne", 1, 4.19, 4.19),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
  ]),
];

// Sanity check: every receipt's stored total must equal the source paragon.
const expected = {
  1: 3.60, 2: 4.00, 3: 78.00, 4: 23.80, 5: 7.49, 6: 15.49, 7: 11.68, 8: 12.99,
  9: 5.07, 10: 85.77, 11: 24.87, 12: 2.10, 13: 27.39, 14: 25.32, 15: 7.80,
  16: 8.58, 17: 9.52, 18: 6.08, 19: 3.57, 20: 199.39, 21: 37.30, 22: 22.88,
  23: 3.85, 24: 8.53, 25: 6.92, 26: 33.19,
};
const mismatches = receipts
  .map((rc, idx) => [idx + 1, rc.total, expected[idx + 1]])
  .filter(([, got, want]) => Math.abs(got - want) > 0.005);
if (mismatches.length) {
  console.error("Total mismatch on receipts:", mismatches);
  process.exit(1);
}
const grand = +receipts.reduce((s, rc) => s + rc.total, 0).toFixed(2);
console.error(`Validated 26 receipts, sum = ${grand} PLN (expected 675.18)`);

// Default: print JSON for inspection / manual import.
const writeFlag = process.argv.includes("--write");
if (!writeFlag) {
  console.log(JSON.stringify(receipts, null, 2));
  process.exit(0);
}

// --write: append to users/{UID}.receipts via firebase-admin.
(async () => {
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
  await ref.set({ receipts: [...existing, ...receipts] }, { merge: true });
  console.error(`Appended ${receipts.length} receipts to users/${uid} (was ${existing.length}, now ${existing.length + receipts.length}).`);
})();
