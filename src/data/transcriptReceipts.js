// 13 paragons collected on 2026-04-30 from a single chat transcript.
// Surfaced via TranscriptReceiptsBanner with a preview-then-confirm flow.
//
// IDs are deterministic (TRANSCRIPT_BASE_ID + 1..13) so the banner can detect
// which receipts are already in Firestore and avoid duplicates.

export const TRANSCRIPT_BASE_ID = 1746000000000;
export const TRANSCRIPT_BATCH_LABEL = "2026-04-30";

const r = (i, meta, items, extras = {}) => {
  const total_discounts = +items.reduce((s, it) => s + (it.discount || 0), 0).toFixed(2);
  const items_total = +items.reduce((s, it) => s + it.total_price, 0).toFixed(2);
  const voucher = extras.voucher || 0;
  const total = +(items_total - voucher).toFixed(2);
  return {
    id: TRANSCRIPT_BASE_ID + i,
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
const LAZISKA = { city: "Łaziska Górne" };

const LIDL_PODLESKA          = { store: "Lidl",                    address: "ul. Podleska 14e",       zip_code: "43-190", ...MIKOLOW };
const BARBARA_J              = { store: "Barbara-J",               address: "os. C.K. Norwida",       zip_code: "43-190", ...MIKOLOW };
const SHELL_LAZISKA          = { store: "Shell",                   address: "ul. Klonowa 1",          zip_code: "43-170", ...LAZISKA };
const AUCHAN_MIKOLOW         = { store: "Auchan",                  address: "ul. Gliwicka 3",         zip_code: "43-190", ...MIKOLOW };
const BIEDRONKA_RADOCKIEGO   = { store: "Biedronka",               address: "ul. Radockiego 150",     zip_code: "40-645", ...KATOWICE };
const KLOS                   = { store: "Kłos Piekarnia Rodzinna", address: "ul. Biedronek 2",        zip_code: "40-645", ...KATOWICE };
const MR_DIY                 = { store: "Mr.DIY",                  address: "ul. Tadeusza Kościuszki 229", zip_code: "40-600", ...KATOWICE };
const BIEDRONKA_KOSCIUSZKI   = { store: "Biedronka",               address: "ul. T. Kościuszki 229",  zip_code: "40-706", ...KATOWICE };
const BIEDRONKA_UNKNOWN      = { store: "Biedronka",               address: "",                       zip_code: "",       city: "" };

export const TRANSCRIPT_RECEIPTS = [
  r(1, { ...LIDL_PODLESKA, date: "2026-04-30" }, [
    item("Brokuły 500g", "Warzywa", 2, 6.99, 8.38, 5.60),
    item("Banany luz", "Owoce", 0.884, 6.99, 2.64, 3.54, "kg"),
    item("Hummus 160g", "Inne", 1, 4.19, 3.77, 0.42),
    item("Hummus 160g", "Inne", 1, 4.19, 3.77, 0.42),
  ]),

  r(2, { ...BARBARA_J, date: "2026-04-30" }, [
    item("Filet z kurczaka B/K KGC", "Mięso", 1.056, 26.99, 28.50, null, "kg"),
  ]),

  r(3, { ...SHELL_LAZISKA, date: "2026-04-30" }, [
    item("Shell FuelSave PB 95", "Paliwo", 9, 6.26, 56.34, null, "l"),
  ]),

  r(4, { ...AUCHAN_MIKOLOW, date: "2026-04-30" }, [
    item("Papier toaletowy", "Chemia", 2, 8.48, 16.96),
    item("Letni płyn do spryskiwaczy", "Chemia", 1, 5.00, 5.00),
    item("Cieciorka konserwa", "Warzywa", 2, 3.19, 6.38),
    item("Coconut Milk", "Napoje", 2, 3.99, 7.98),
    item("Soczewica konserwa", "Warzywa", 1, 3.39, 3.39),
    item("Fasola czarna", "Warzywa", 2, 3.98, 7.96),
    item("Ziemniaki", "Warzywa", 1, 5.99, 5.99),
    item("Groszek konserwowy", "Warzywa", 2, 2.65, 5.30),
    item("Pomidor koktajlowy", "Warzywa", 1, 13.99, 13.99),
    item("Cebula szalotka", "Warzywa", 1, 1.99, 1.99),
    item("Koncentrat pomidorowy", "Warzywa", 1, 3.48, 3.48),
    item("Koncentrat pomidorowy", "Warzywa", 2, 3.48, 3.48, 3.48),
    item("Musztarda", "Przyprawy", 1, 2.98, 2.98),
    item("Ser twardy", "Nabiał", 1, 14.68, 14.68),
    item("Baterie AA", "Elektronika", 1, 7.99, 7.99),
    item("Cheddar Mo", "Nabiał", 1, 9.98, 9.98),
    item("Tortilla", "Pieczywo", 1, 9.99, 9.99),
    item("Czosnek", "Warzywa", 1, 2.59, 2.59),
    item("Ketchup Łowicki", "Przyprawy", 2, 6.98, 13.96),
    item("Algi morskie", "Inne", 1, 5.99, 5.99),
    item("Musztarda", "Przyprawy", 1, 1.99, 1.99),
    item("Jaja wolnowybiegowe", "Nabiał", 1, 7.99, 7.99),
    item("Mielone Z", "Mięso", 1, 10.98, 0.01, 10.97),
    item("Mielone WP", "Mięso", 1, 13.99, 13.99),
    item("Mielone WO", "Mięso", 2, 19.99, 39.98),
  ]),

  r(5, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-28" }, [
    item("Polaris L. Gaz 1,5 l", "Napoje", 12, 1.19, 14.28),
    item("Kaucja butelki plastikowe", "Inne", 12, 0.50, 6.00),
  ]),

  r(6, { ...KLOS, date: "2026-04-27" }, [
    item("Bułka grahamka z ziarnami", "Pieczywo", 2, 2.10, 4.20),
    item("Bułka grahamka z ziarnami", "Pieczywo", 2, 2.30, 4.60),
  ]),

  r(7, { ...KLOS, date: "2026-04-25" }, [
    item("Bułka wieloziarnista", "Pieczywo", 2, 2.30, 4.60),
    item("Bułka maślana bez maku", "Pieczywo", 2, 1.80, 3.60),
  ]),

  r(8, { ...MR_DIY, date: "2026-04-30" }, [
    item("Ręcznik kąpielowy 70×140 cm 360G", "Dom", 1, 14.90, 14.90),
  ]),

  r(9, { ...BIEDRONKA_UNKNOWN, date: "2026-04-29" }, [
    item("Majonez Winary 500ml", "Przyprawy", 1, 11.65, 11.65),
    item("Banan luz", "Owoce", 1.075, 6.99, 3.21, 4.30, "kg"),
    item("Rzodkiewka pęczek", "Warzywa", 2, 2.49, 2.48, 2.50),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 2.49, 0.50),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 2.49, 0.50),
  ]),

  r(10, { ...BIEDRONKA_KOSCIUSZKI, date: "2026-04-30" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Pierogi z serem 400g", "Zboża", 1, 7.49, 4.86, 2.63),
    item("Pierogi z serem 400g", "Zboża", 1, 7.49, 4.86, 2.63),
    item("Awokado Hass szt", "Owoce", 2, 6.99, 6.98, 7.00),
  ]),

  r(11, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-27" }, [
    item("Pomidor gałązkowy luz", "Warzywa", 1.008, 14.99, 8.05, 7.06, "kg"),
    item("Papryka słodka czerwona", "Warzywa", 0.588, 19.99, 5.87, 5.88, "kg"),
    item("Ser żółty 135g", "Nabiał", 3, 6.49, 12.98, 6.49),
    item("Pieczarki 500g opa", "Warzywa", 1, 7.99, 4.99, 3.00),
    item("Truskawki mrożone 750g", "Owoce", 2, 11.89, 17.98, 5.80),
    item("Serek wiejski 200g", "Nabiał", 2, 2.29, 4.58),
  ]),

  r(12, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-27" }, [
    item("Hummus Paprykowy 160g", "Inne", 1, 4.19, 3.29, 0.90),
    item("Hummus Klasyczny 160g", "Inne", 1, 4.19, 3.29, 0.90),
  ]),

  r(13, { ...BIEDRONKA_RADOCKIEGO, date: "2026-04-25" }, [
    item("Sok Pomidorowy Vital Fres 1 l", "Napoje", 1, 8.99, 6.73, 2.26),
    item("Sok Pomidorowy Vital Fres 1 l", "Napoje", 1, 8.99, 6.74, 2.25),
    item("Sos Napoletana 350g", "Przyprawy", 1, 5.99, 4.08, 1.91),
    item("Passata Gust Bel 690g", "Warzywa", 1, 7.55, 5.13, 2.42),
    item("Passata Gust Bel 690g", "Warzywa", 1, 7.55, 5.14, 2.41),
    item("Sos Basilico 350g", "Przyprawy", 1, 5.99, 4.07, 1.92),
    item("Sos Pomid Gus Bel 600g", "Przyprawy", 1, 8.99, 6.12, 2.87),
    item("Ser Rycki Edam 135g", "Nabiał", 1, 6.19, 6.19),
    item("Ser Rycki Edam 135g", "Nabiał", 1, 6.19, 6.19),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 1.99, 1.00),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 1.99, 1.00),
    item("Ser Mozzarella 125g", "Nabiał", 1, 2.99, 1.99, 1.00),
    item("Mix Sał Rodz 220G VF", "Warzywa", 1, 5.99, 5.99),
    item("Spodyno Pizzy GB 280g", "Pieczywo", 1, 6.29, 4.28, 2.01),
    item("Ogórek szklarniowy luz", "Warzywa", 0.278, 14.99, 1.67, 2.50, "kg"),
    item("Pinsa Gourmet 460g", "Pieczywo", 1, 23.99, 23.99),
    item("Cebula żółta luz", "Warzywa", 0.686, 3.49, 2.05, 0.34, "kg"),
    item("Polaris L. Gaz 1,5 l", "Napoje", 6, 1.19, 7.14),
    item("Kaucja butelki plastikowe", "Inne", 8, 0.50, 4.00),
  ]),
];
