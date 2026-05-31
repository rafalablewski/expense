// 22 paragons collected on 2026-05-31 from a single chat transcript (2026-05-20 → 2026-05-30).
// Surfaced via LateMay2026ReceiptsBanner at the top of the page with a one-click import.
//
// IDs are deterministic (LATE_MAY_2026_BASE_ID + 1..22) so the banner can detect
// which receipts are already in Firestore and avoid duplicates.

export const LATE_MAY_2026_BASE_ID = 1748000000000;
export const LATE_MAY_2026_BATCH_LABEL = "2026-05-late";

const r = (i, meta, items, extras = {}) => {
  const total_discounts = +items.reduce((s, it) => s + (it.discount || 0), 0).toFixed(2);
  const items_total = +items.reduce((s, it) => s + it.total_price, 0).toFixed(2);
  const voucher = extras.voucher || 0;
  const total = +(items_total - voucher).toFixed(2);
  return {
    id: LATE_MAY_2026_BASE_ID + i,
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
const MIKOLOW  = { city: "Mikołów" };

// ── Store locations ──
const NETTO_AK             = { store: "Netto",                   address: "ul. Armii Krajowej 208", zip_code: "40-750", ...KATOWICE };
const KLOS_AK              = { store: "Kłos Piekarnia Rodzinna", address: "ul. Armii Krajowej 208", zip_code: "40-750", ...KATOWICE };
const KAUFLAND_AK          = { store: "Kaufland",                address: "ul. Armii Krajowej 53",  zip_code: "40-698", ...KATOWICE };
const MAX_BURGERS          = { store: "Max Premium Burgers",     address: "ul. Kościuszki 249",     zip_code: "40-523", ...KATOWICE };
const BIEDRONKA_RADOCKIEGO = { store: "Biedronka",               address: "ul. Radockiego 150",     zip_code: "40-645", ...KATOWICE };
const INTERMARCHE          = { store: "Intermarché",             address: "ul. Armii Krajowej 188", zip_code: "40-750", ...KATOWICE };
const SWIEZYZNA            = { store: "Świeżyzna",               address: "ul. Armii Krajowej 208", zip_code: "40-750", ...KATOWICE };
const AUCHAN_MIKOLOW       = { store: "Auchan",                  address: "ul. Gliwicka 3",         zip_code: "43-190", ...MIKOLOW };
const LIDL_SZARYCH         = { store: "Lidl",                    address: "ul. Szarych Szeregów 3A", zip_code: "40-750", ...KATOWICE };
const ROSSMANN_BAZANTOW    = { store: "Rossmann",                address: "ul. Bażantów 6 c/1e",    zip_code: "40-668", ...KATOWICE };
const TAURON               = { store: "Tauron",                  address: "", zip_code: "", city: "" };
const UNKNOWN              = { store: "",                        address: "", zip_code: "", city: "" };

export const LATE_MAY_2026_RECEIPTS = [
  // ── #1 Netto, 2026-05-28 — 4,19 PLN ──
  r(1, { ...NETTO_AK, date: "2026-05-28" }, [
    item("Chleb żytni 400g", "Pieczywo", 1, 4.19, 4.19),
  ]),

  // ── #2 Kłos Piekarnia (Armii Krajowej), 2026-05-28 — 5,40 PLN ──
  r(2, { ...KLOS_AK, date: "2026-05-28" }, [
    item("Bułka maślana bez maku", "Pieczywo", 1, 5.40, 5.40, null, "szt", "pakiet 3+1"),
  ]),

  // ── #3 Kaufland, 2026-05-20 — 22,08 PLN ──
  r(3, { ...KAUFLAND_AK, date: "2026-05-20" }, [
    item("Opłata za plastik", "Inne", 1, 0.27, 0.27),
    item("Surówka kiszona kapusta", "Warzywa", 0.238, 10.90, 2.59, null, "kg"),
    item("Sierpc Ser Królewski", "Nabiał", 0.126, 29.92, 3.77, null, "kg"),
    item("STD. Serek Wiejski 200g", "Nabiał", 2, 2.29, 4.58),
    item("Cebula żółta 1 kg", "Warzywa", 1, 3.49, 2.29, 1.20, "szt", "Kupon XTRA"),
    item("Melvit Quinoa 150g", "Zboża", 1, 6.59, 6.59),
    item("KLC Pęczak Kujawski 4×100g", "Zboża", 1, 1.99, 1.99),
  ]),

  // ── #4 Netto, 2026-05-26 — 6,18 PLN ──
  r(4, { ...NETTO_AK, date: "2026-05-26" }, [
    item("Mozzarella 125g", "Nabiał", 2, 3.09, 6.18),
  ]),

  // ── #5 Max Premium Burgers, 2026-05-26 — 15,35 PLN ──
  r(5, { ...MAX_BURGERS, date: "2026-05-26" }, [
    item("Cheeseburger", "Restauracje", 1, 4.50, 4.50),
    item("Chicken Jr", "Restauracje", 1, 4.40, 4.40),
    item("Crispy Fries (small)", "Restauracje", 1, 4.60, 4.60),
    item("Coffee (medium)", "Restauracje", 1, 1.60, 1.60),
    item("Plastic Fee Cup", "Restauracje", 1, 0.25, 0.25),
  ]),

  // ── #6 Biedronka, 2026-05-26 — 6,69 PLN ──
  r(6, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-26" }, [
    item("Awokado Hass szt", "Owoce", 2, 6.69, 6.69, 6.69),
  ]),

  // ── #7 Intermarché, 2026-05-24 — 3,38 PLN (+1,00 kaucja PET) ──
  r(7, { ...INTERMARCHE, date: "2026-05-24" }, [
    item("Woda mineralna niegazowana 1 l", "Napoje", 2, 1.19, 2.38),
    item("Kaucja butelki PET", "Inne", 2, 0.50, 1.00),
  ]),

  // ── #8 Świeżyzna (drób), 2026-05-25 — 19,49 PLN ──
  r(8, { ...SWIEZYZNA, date: "2026-05-25" }, [
    item("Filet z kurczaka", "Mięso", 0.78, 24.99, 19.49, null, "kg"),
  ]),

  // ── #9 Kłos Piekarnia (Armii Krajowej), 2026-05-25 — 4,20 PLN ──
  r(9, { ...KLOS_AK, date: "2026-05-25" }, [
    item("Bułka maślana bez maku", "Pieczywo", 1, 1.80, 1.80),
    item("Bułka cebulowa z serem", "Pieczywo", 1, 2.40, 2.40),
  ]),

  // ── #10 Netto, 2026-05-25 — 2,49 PLN ──
  r(10, { ...NETTO_AK, date: "2026-05-25" }, [
    item("Awokado", "Owoce", 1, 2.49, 2.49),
  ]),

  // ── #11 Auchan (Mikołów), 2026-05-25 — 94,19 PLN (+0,50 kaucja) ──
  r(11, { ...AUCHAN_MIKOLOW, date: "2026-05-25" }, [
    item("Woda niegazowana SK", "Napoje", 1, 11.28, 11.28),
    item("Papier RUM 328338", "Chemia", 1, 8.48, 8.48),
    item("Papier RUM 328338", "Chemia", 1, 8.48, 8.48),
    item("Musztarda M", "Przyprawy", 1, 2.98, 2.98),
    item("Sos BBQ", "Przyprawy", 1, 5.98, 5.98),
    item("Chleb żytni", "Pieczywo", 1, 4.99, 4.99),
    item("Woda lecznicza", "Napoje", 1, 2.58, 2.58),
    item("Taralli Z", "Inne", 1, 4.99, 4.99),
    item("Napój bezalkoholowy", "Napoje", 1, 4.99, 4.99),
    item("Soczewica K", "Warzywa", 1, 3.19, 3.19),
    item("FP Ser Mim", "Nabiał", 0.121, 41.93, 5.07, null, "kg"),
    item("Ser twardy", "Nabiał", 1, 14.68, 14.68),
    item("Musztarda F", "Przyprawy", 1, 2.49, 2.49),
    item("Musztarda", "Przyprawy", 1, 2.98, 2.98),
    item("Jogurt grecki", "Nabiał", 1, 4.15, 4.15),
    item("Cieciorka K", "Warzywa", 1, 3.19, 3.19),
    item("Cieciorka K", "Warzywa", 1, 3.19, 3.19),
    item("Kaucja (opakowanie zwrotne)", "Inne", 1, 0.50, 0.50),
  ]),

  // ── #12 Lidl (Szarych Szeregów), 2026-05-26 — 96,45 PLN (kaucja +6,50, zwrot opakowań -18,70) ──
  r(12, { ...LIDL_SZARYCH, date: "2026-05-26" }, [
    item("Muszynia Woda 1,5 l", "Napoje", 12, 3.29, 19.68, 19.80),
    item("Ser w plastrach Carski", "Nabiał", 1, 34.99, 19.99, 15.00),
    item("Pomidory kiściowe luz", "Warzywa", 0.584, 12.99, 2.92, 4.67, "kg"),
    item("Muszle do taco", "Pieczywo", 2, 8.99, 13.48, 4.50),
    item("Brzoskwinie luz", "Owoce", 0.518, 19.99, 6.21, 4.14, "kg"),
    item("Mango luz", "Owoce", 0.512, 14.99, 4.60, 3.07, "kg"),
    item("Bułka z ziarnami", "Pieczywo", 2, 1.35, 2.42, 0.28),
    item("Por szt", "Warzywa", 1, 4.99, 4.99),
    item("Kefir naturalny 400g", "Nabiał", 1, 2.28, 2.28),
    item("Passata pomidorowa 720ml", "Warzywa", 1, 6.69, 6.69),
    item("Sok tłoczony jabłko 100%", "Napoje", 1, 4.99, 4.99),
    item("Serek wiejski", "Nabiał", 3, 2.29, 6.87),
    item("Ogórki gruntowe PL luz", "Warzywa", 0.212, 12.99, 2.75, null, "kg"),
    item("Limetki szt", "Owoce", 1, 1.99, 1.99),
    item("Kolendra w doniczce", "Warzywa", 1, 7.99, 7.99),
    item("Cebula czerwona luz", "Warzywa", 0.146, 5.49, 0.80, null, "kg"),
    item("Kaucja butelki PET", "Inne", 13, 0.50, 6.50),
    item("Zwrot kaucji za butelki", "Inne", 1, null, -18.70, null, "szt", "zwrot opakowań"),
  ]),

  // ── #13 Tauron (rachunek za prąd), data niepodana — 370,00 PLN ──
  r(13, { ...TAURON, date: "" }, [
    item("Opłata za energię elektryczną", "Dom", 1, 370.00, 370.00),
  ]),

  // ── #14 Owoce (sklep niepodany), data niepodana — 18,20 PLN ──
  r(14, { ...UNKNOWN, date: "" }, [
    item("Truskawki", "Owoce", 0.340, null, 8.20, null, "kg"),
    item("Śliwki", "Owoce", 0.350, null, 10.00, null, "kg"),
  ]),

  // ── #15 Biedronka, 2026-05-22 — 24,21 PLN ──
  r(15, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-22" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Ciabatta 80g", "Pieczywo", 3, 1.14, 3.42),
    item("Awokado Hass szt", "Owoce", 2, 6.99, 6.98, 7.00),
    item("Kasza Pęczak 4×100g", "Zboża", 3, 1.99, 4.27, 1.70),
    item("Kasza Kuskus 300g", "Zboża", 1, 2.99, 2.14, 0.85),
    item("Kasza Jęczmienna Perłowa 4×100g", "Zboża", 1, 1.99, 1.42, 0.57),
    item("Kasza Jaglana PL Naturalna 4×100g", "Zboża", 1, 2.99, 2.13, 0.86),
  ]),

  // ── #16 Biedronka, 2026-05-23 — 24,50 PLN (+1,00 kaucja) ──
  r(16, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-23" }, [
    item("Polaris N. Gaz 1,5 l", "Napoje", 2, 1.19, 2.38),
    item("Sok Tłoczony Brzoskwinia Sado 0,75 l", "Napoje", 1, 5.95, 5.95),
    item("Brzoskwinia luz", "Owoce", 0.745, 17.99, 8.19, 5.21, "kg"),
    item("Awokado Hass szt", "Owoce", 2, 6.99, 6.98, 7.00),
    item("Kaucja butelki PET", "Inne", 2, 0.50, 1.00),
  ]),

  // ── #17 Biedronka, 2026-05-27 — 13,90 PLN ──
  r(17, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-27" }, [
    item("Kwasek cytrynowy 3×20g", "Przyprawy", 1, 3.99, 3.99),
    item("Papryka Słodka Czerwona", "Warzywa", 0.195, 14.99, 2.92, null, "kg"),
    item("Kukurydza Próżniowa NS 3×140g", "Warzywa", 1, 6.99, 6.99),
  ]),

  // ── #18 Biedronka, 2026-05-28 — 38,73 PLN ──
  r(18, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-28" }, [
    item("Pinsa Gusto Bella 230g", "Pieczywo", 2, 13.59, 13.59, 13.59, "szt", "Promocja 1+1"),
    item("Awokado Hass szt", "Owoce", 2, 6.69, 6.68, 6.70),
    item("Ser Mozzarella 125g", "Nabiał", 3, 2.99, 8.07, 0.90),
    item("Sok Tłoczony Brzoskwinia Sado 0,75 l", "Napoje", 1, 5.95, 5.95),
    item("Banan luz", "Owoce", 1.486, 6.99, 4.44, 5.95, "kg"),
  ]),

  // ── #19 Biedronka, 2026-05-30 — 27,35 PLN ──
  r(19, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-30" }, [
    item("Papryka Słodka Czerwona", "Warzywa", 0.550, 14.99, 4.39, 3.85, "kg"),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Kefir Krasnystaw 420g", "Nabiał", 1, 2.89, 2.89),
    item("Buraki Gotowane 500g", "Warzywa", 1, 4.79, 4.79),
    item("Banan luz", "Owoce", 1.588, 6.99, 4.75, 6.35, "kg"),
    item("Awokado Hass szt", "Owoce", 2, 6.69, 6.68, 6.70),
  ]),

  // ── #20 Biedronka, 2026-05-30 — 22,97 PLN ──
  r(20, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-30" }, [
    item("Pomidor malinowy Polska luz", "Warzywa", 0.574, 12.99, 4.01, 3.45, "kg"),
    item("Pomidor Mini San Marzano 300g", "Warzywa", 1, 7.99, 7.99),
    item("Bułka śniadaniowa ziarnista 80g", "Pieczywo", 2, 1.35, 2.70),
    item("Cytryna luz", "Owoce", 0.332, 11.99, 3.98, null, "kg"),
    item("Mix sałat z rzymską 160g", "Warzywa", 1, 4.29, 4.29),
  ]),

  // ── #21 Biedronka, 2026-05-28 — 13,59 PLN ──
  r(21, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-28" }, [
    item("Pinsa Gusto Bella 230g", "Pieczywo", 2, 13.59, 13.59, 13.59, "szt", "Promocja 1+1"),
  ]),

  // ── #22 Rossmann (Bażantów), 2026-05-30 — 28,58 PLN ──
  r(22, { ...ROSSMANN_BAZANTOW, date: "2026-05-30" }, [
    item("Yope mydło w płynie", "Kosmetyki", 1, 35.99, 23.99, 12.00),
    item("Domol Pear Perfect", "Chemia", 1, 5.29, 4.59, 0.70),
  ]),
];
