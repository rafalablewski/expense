// 26 paragons collected April 2026, available as a one-click import via the
// in-app banner (see components/banners/SeedReceiptsBanner.jsx). The same data
// powers scripts/seedReceipts.js for offline / firebase-admin imports.
//
// IDs are deterministic (SEED_BASE_ID + 1..26) so the banner can detect which
// receipts are already in the user's Firestore document and avoid duplicates.

export const SEED_BASE_ID = 1745580000000;
export const SEED_BATCH_LABEL = "2026-04";

const r = (i, meta, items, extras = {}) => {
  const total_discounts = +items.reduce((s, it) => s + (it.discount || 0), 0).toFixed(2);
  const items_total = +items.reduce((s, it) => s + it.total_price, 0).toFixed(2);
  const voucher = extras.voucher || 0;
  const total = +(items_total - voucher).toFixed(2);
  return {
    id: SEED_BASE_ID + i,
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

export const SEED_RECEIPTS = [
  r(1, { ...KLOS, date: "2026-04-23" }, [
    item("Bułka maślana bez maku", "Pieczywo", 1, 1.80, 1.80),
    item("Bułka maślana bez maku", "Pieczywo", 1, 1.80, 1.80),
  ]),

  r(2, { store: "Galeria Katowicka — Parking", city: "Katowice", date: "2026-04-25" }, [
    item("Parking", "Transport", 1, 4.00, 4.00),
  ]),

  r(3, { store: "Pizza prosto z Pieca", date: "2026-04-25" }, [
    item("Pizza Margherita", "Restauracje", 1, 32.00, 32.00),
    item("Pizza Cotto", "Restauracje", 1, 46.00, 46.00),
  ]),

  r(4, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-23" }, [
    item("Ser Grill Delikatesowy 200g", "Nabiał", 1, 8.49, 8.49),
    item("Serek Wiejski 200g", "Nabiał", 2, 2.99, 4.98, 1.00),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Avokado", "Owoce", 2, 6.49, 6.48, 6.50),
  ]),

  r(5, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-22" }, [
    item("Pierogi z serem 400g", "Zboża", 1, 7.49, 7.49),
  ]),

  r(6, { ...ROSSMANN_KOSCIUSZKI, date: "2026-04-22" }, [
    item("Vope żel pod prysznic", "Kosmetyki", 1, 18.99, 15.49, 3.50),
  ]),

  r(7, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-09" }, [
    item("Muszyna-Skarb 1,5 l", "Napoje", 12, 1.89, 22.68),
  ], { voucher: 11.00 }),

  r(8, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-21" }, [
    item("Pomidory Malinowe Polska 500g", "Warzywa", 1, 12.99, 12.99),
  ]),

  r(9, { ...ROSSMANN_BAZANTOW, date: "2026-04-10" }, [
    item("Isana żel pod prysznic", "Kosmetyki", 3, 2.19, 5.07, 1.50),
  ]),

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

  r(11, { ...NETTO_AK, date: "2026-04-22" }, [
    item("Woda kokosowa 320 ml", "Napoje", 3, 5.09, 15.27),
    item("Smoothie jabłko-pomarańcza-mango 1 l", "Napoje", 1, 4.80, 4.80),
    item("Smoothie jabłko-truskawka-marakuja 1 l", "Napoje", 1, 4.80, 4.80),
  ]),

  r(12, { ...WYGORZELE, date: "2026-04-10" }, [
    item("Bułka graham z ziarnami 80g", "Pieczywo", 1, 2.10, 2.10),
  ]),

  r(13, { ...LIDL_SZARYCH, date: "2026-04-09" }, [
    item("Banany luz", "Owoce", 1.474, 6.99, 4.41, 5.89, "kg"),
    item("Pinsa pełnoziarnista", "Pieczywo", 1, 11.99, 11.99),
    item("Ser cheddar wiórki", "Nabiał", 1, 10.99, 10.99),
  ]),

  r(14, { ...NETTO_AK, date: "2026-04-09" }, [
    item("Baton owocowy 35g", "Słodycze", 1, 1.77, 1.77),
    item("Tortilla pszenna 250g", "Pieczywo", 2, 3.79, 7.58),
    item("Jabłka luz", "Owoce", 0.410, 5.19, 1.43, 0.70, "kg"),
    item("Cukinia luz", "Warzywa", 1.455, 16.99, 14.54, 10.18, "kg"),
  ]),

  r(15, { ...KLOS, date: "2026-04-21" }, [
    item("Chleb Staropolski", "Pieczywo", 1, 7.80, 7.80),
  ]),

  r(16, { ...NETTO_AK, date: "2026-04-03" }, [
    item("Dr. Witt 550 ml", "Napoje", 1, 2.99, 2.99),
    item("Coconaut 320 ml", "Napoje", 1, 5.09, 5.09),
    item("Kaucja ALU", "Inne", 1, 0.50, 0.50),
  ]),

  r(17, { ...LIDL_PODLESKA, date: "2026-04-07" }, [
    item("Solone Paprykachipsy", "Słodycze", 1, 4.94, 4.94),
    item("Serek wiejski", "Nabiał", 2, 2.29, 4.58),
  ]),

  r(18, { ...LIDL_PODLESKA, date: "2026-04-07" }, [
    item("Bułka z ziarnami", "Pieczywo", 2, 1.35, 2.42, 0.28),
    item("Bułka orkiszowa 60%", "Pieczywo", 1, 1.67, 1.67),
    item("Czosnek młody szt.", "Warzywa", 1, 1.99, 1.99),
  ]),

  r(19, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-07" }, [
    item("Bułka żytnia 55g", "Pieczywo", 3, 1.19, 3.57),
  ]),

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

  r(22, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-04" }, [
    item("Roszponka Myta VF 100g", "Warzywa", 1, 5.99, 5.99),
    item("Kefir Krasnystaw 420g", "Nabiał", 1, 2.89, 2.89),
    item("Śliwka luz", "Owoce", 0.365, 11.99, 4.38, null, "kg"),
    item("Cebula żółta luz", "Warzywa", 0.410, 3.49, 1.43, null, "kg"),
    item("Pomidor malinowy Polska luz", "Warzywa", 0.455, 24.99, 8.19, 3.18, "kg"),
  ]),

  r(23, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
  ]),

  r(24, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Chipsy Top Solone 150g", "Słodycze", 1, 4.95, 4.95),
    item("Jogurt Naturalny 400g", "Nabiał", 1, 1.79, 1.79),
    item("Jogurt Naturalny 400g", "Nabiał", 1, 1.79, 1.79),
  ]),

  r(25, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-08" }, [
    item("Pomidor malinowy Polska luz", "Warzywa", 0.41, 24.99, 6.92, 3.33, "kg"),
  ]),

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
