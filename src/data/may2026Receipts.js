// 36 paragons collected May 2026 from a single chat transcript (2026-05-02 → 2026-05-21).
// Surfaced via May2026ReceiptsBanner on the dashboard with a one-click import.
//
// IDs are deterministic (MAY_2026_BASE_ID + 1..36) so the banner can detect
// which receipts are already in Firestore and avoid duplicates.

export const MAY_2026_BASE_ID = 1747300000000;
export const MAY_2026_BATCH_LABEL = "2026-05";

const r = (i, meta, items, extras = {}) => {
  const total_discounts = +items.reduce((s, it) => s + (it.discount || 0), 0).toFixed(2);
  const items_total = +items.reduce((s, it) => s + it.total_price, 0).toFixed(2);
  const voucher = extras.voucher || 0;
  const total = +(items_total - voucher).toFixed(2);
  return {
    id: MAY_2026_BASE_ID + i,
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
const TYCHY    = { city: "Tychy" };
const LAZISKA  = { city: "Łaziska Górne" };

// ── Store locations ──
const MAX_BURGERS         = { store: "Max Premium Burgers",       address: "ul. Kościuszki 249",       zip_code: "40-523", ...KATOWICE };
const ROSSMANN_BAZANTOW   = { store: "Rossmann",                  address: "ul. Bażantów 6 c/1e",      zip_code: "40-668", ...KATOWICE };
const LIDL_SZARYCH        = { store: "Lidl",                      address: "ul. Szarych Szeregów 3A",  zip_code: "40-750", ...KATOWICE };
const CIRCLE_K            = { store: "Circle K",                  address: "ul. Szarych Szeregów 3",   zip_code: "40-750", ...KATOWICE };
const NETTO_AK            = { store: "Netto",                     address: "ul. Armii Krajowej 208",   zip_code: "40-750", ...KATOWICE };
const IKEA_KATOWICE       = { store: "IKEA",                      address: "al. W. Roździeńskiego 95", zip_code: "40-203", ...KATOWICE };
const KAUFLAND_AK         = { store: "Kaufland",                  address: "ul. Armii Krajowej 53",    zip_code: "40-698", ...KATOWICE };
const KLOS_AK             = { store: "Kłos Piekarnia Rodzinna",   address: "ul. Armii Krajowej 208",   zip_code: "40-750", ...KATOWICE };
const KLOS_BIEDRONEK      = { store: "Kłos Piekarnia Rodzinna",   address: "ul. Biedronek 2",          zip_code: "40-645", ...KATOWICE };
const BIEDRONKA_RADOCKIEGO = { store: "Biedronka",                address: "ul. Radockiego 150",       zip_code: "40-645", ...KATOWICE };
const ROSSMANN_KOSCIUSZKI = { store: "Rossmann",                  address: "ul. Kościuszki 229",       zip_code: "40-600", ...KATOWICE };
const SWIEZYZNA           = { store: "Świeżyzna",                 address: "ul. Armii Krajowej 208",   zip_code: "40-750", ...KATOWICE };
const KONACH              = { store: "Sklep Drób-Wędliny Konach", address: "ul. Szewska 11",           zip_code: "40-649", ...KATOWICE };
const BIEDRONKA_PODLESKA  = { store: "Biedronka",                 address: "ul. Podleska 8A",          zip_code: "43-190", ...MIKOLOW };
const POD_BELKAMI         = { store: "Pod Belkami",               address: "ul. Św. Wojciecha 16",     zip_code: "43-190", ...MIKOLOW };
const MCDONALDS_MIKOLOW   = { store: "McDonald's",                address: "ul. Cieszyńska 19",        zip_code: "43-190", ...MIKOLOW };
const FARINA_NAPOLI       = { store: "Farina Napoli",             address: "al. Jana Pawła II 10",     zip_code: "43-100", ...TYCHY };
const LODOVO              = { store: "Lodovo",                    address: "ul. Dworcowa 24",          zip_code: "43-170", ...LAZISKA };

export const MAY_2026_RECEIPTS = [
  // ── #1 Max Premium Burgers, 2026-05-09 — 35,60 PLN ──
  r(1, { ...MAX_BURGERS, date: "2026-05-09" }, [
    item("Cheeseburger", "Restauracje", 1, 4.50, 4.50),
    item("Chicken Jr", "Restauracje", 1, 4.40, 4.40),
    item("Crispy fries small", "Restauracje", 1, 4.60, 4.60),
    item("Plastic Fee Cup", "Restauracje", 1, 0.25, 0.25),
    item("Tea Green, large", "Restauracje", 1, 1.60, 1.60),
    item("Maxoumiburger", "Restauracje", 1, 12.00, 12.00),
    item("Sourcream & Pepper", "Restauracje", 1, 0.80, 0.80),
    item("Apple wedges", "Restauracje", 1, 5.60, 5.60),
    item("Plastic Fee Cup", "Restauracje", 1, 0.25, 0.25),
    item("Coffee w/ milk, Medium", "Restauracje", 1, 1.60, 1.60),
  ]),

  // ── #2 Rossmann (Bażantów), 2026-05-08 — 44,98 PLN ──
  r(2, { ...ROSSMANN_BAZANTOW, date: "2026-05-08" }, [
    item("Elmex Sensitive pasta", "Kosmetyki", 2, 31.99, 44.98, 19.00),
  ]),

  // ── #3 Lidl, 2026-05-04 — 37,47 PLN (z kaucją -17,80) ──
  r(3, { ...LIDL_SZARYCH, date: "2026-05-04" }, [
    item("Awokado Hass 500g", "Owoce", 1, 12.99, 7.99, 5.00),
    item("Rzodkiewki pęczek", "Warzywa", 2, 2.99, 2.98, 3.00),
    item("Pomidory z dodatkami", "Warzywa", 1, 3.99, 3.99),
    item("Pomidory z dodatkami", "Warzywa", 1, 3.99, 3.99),
    item("Cebula dymka pęczek", "Warzywa", 1, 2.39, 2.39),
    item("Dawtona Sok 100% 0,3 l", "Napoje", 1, 1.99, 1.99),
    item("Serek wiejski", "Nabiał", 3, 2.29, 6.87),
    item("Ser Mimolette z mozzarellą", "Nabiał", 1, 12.59, 12.59),
    item("Śmietanka 36%", "Nabiał", 1, 4.49, 4.49),
    item("Kolendra w doniczce", "Warzywa", 1, 7.99, 7.99),
  ], { voucher: 17.80 }),

  // ── #4 Circle K (paliwo), 2026-05-05 — 64,90 PLN ──
  r(4, { ...CIRCLE_K, date: "2026-05-05" }, [
    item("MILES+ 95", "Paliwo", 10, 6.49, 64.90, null, "l"),
  ]),

  // ── #5 Farina Napoli (Tychy), 2026-05-05 — 99,00 PLN ──
  r(5, { ...FARINA_NAPOLI, date: "2026-05-05" }, [
    item("Pizza Margherita", "Restauracje", 2, 32.00, 64.00),
    item("Lemoniada domowa 1 l", "Restauracje", 1, 35.00, 35.00),
  ]),

  // ── #6 Netto, 2026-05-04 — 16,50 PLN ──
  r(6, { ...NETTO_AK, date: "2026-05-04" }, [
    item("Chleb żytni 400g", "Pieczywo", 1, 4.19, 4.19),
    item("Kefir butelka 400g", "Nabiał", 1, 1.72, 1.72),
    item("Roszponka 70g", "Warzywa", 1, 2.90, 2.90),
    item("Pomidor malinowy luz", "Warzywa", 0.770, 22.99, 7.69, 10.01, "kg"),
  ]),

  // ── #7 IKEA, 2026-05-11 — 10,50 PLN ──
  r(7, { ...IKEA_KATOWICE, date: "2026-05-11" }, [
    item("Hot dog wegetariański", "Restauracje", 1, 3.50, 3.50),
    item("Hot dog wege bez dodatków", "Restauracje", 1, 2.50, 2.50),
    item("Hot dog z dodatkami", "Restauracje", 1, 4.50, 4.50),
  ]),

  // ── #8 Netto, 2026-05-06 — 13,57 PLN ──
  r(8, { ...NETTO_AK, date: "2026-05-06" }, [
    item("Twarożek naturalny 150g", "Nabiał", 1, 2.69, 2.69),
    item("Chleb żytni 400g", "Pieczywo", 1, 4.19, 4.19),
    item("Winogrono 500g", "Owoce", 1, 6.69, 6.69),
  ]),

  // ── #9 Netto, 2026-05-08 — 25,35 PLN ──
  r(9, { ...NETTO_AK, date: "2026-05-08" }, [
    item("Pomidor truskawkowy 300g", "Warzywa", 1, 9.99, 9.99),
    item("Kefir butelka 400g", "Nabiał", 1, 1.61, 1.61),
    item("Szpinak baby 200g", "Warzywa", 1, 4.99, 4.99),
    item("Bułka paryska 240g", "Pieczywo", 1, 3.15, 3.15),
    item("Mortadella 100g", "Mięso", 1, 5.61, 5.61),
  ]),

  // ── #10 Kaufland, 2026-05-09 — 38,58 PLN ──
  r(10, { ...KAUFLAND_AK, date: "2026-05-09" }, [
    item("KLC Mozzarella 125g", "Nabiał", 2, 2.99, 5.98),
    item("KLC Ricotta 47% 250g", "Nabiał", 2, 5.49, 10.98),
    item("Szpinak 200g", "Warzywa", 1, 5.99, 5.99),
    item("Chleb żytni 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Dawtona Passata 690g", "Warzywa", 1, 6.29, 6.29),
    item("Przysnacki Chipsy Maślane z Solą 130g", "Słodycze", 1, 5.49, 5.49),
  ]),

  // ── #11 Kłos Piekarnia (Armii Krajowej), 2026-05-07 — 12,40 PLN ──
  r(11, { ...KLOS_AK, date: "2026-05-07" }, [
    item("Bułka cięta", "Pieczywo", 2, 1.75, 3.50),
    item("Chleb cebulowy", "Pieczywo", 1, 8.90, 8.90),
  ]),

  // ── #12 Kłos Piekarnia (Biedronek), 2026-05-03 — 16,00 PLN ──
  r(12, { ...KLOS_BIEDRONEK, date: "2026-05-03" }, [
    item("Lody gałkowe", "Słodycze", 2, 8.00, 16.00),
  ]),

  // ── #13 Lodovo (Łaziska Górne), 2026-05-02 — 18,00 PLN ──
  r(13, { ...LODOVO, date: "2026-05-02" }, [
    item("Lody gałkowe", "Słodycze", 2, 9.00, 18.00),
  ]),

  // ── #14 Lidl, 2026-05-07 — 61,29 PLN ──
  r(14, { ...LIDL_SZARYCH, date: "2026-05-07" }, [
    item("Pomidory malinowe PL luz", "Warzywa", 0.850, 17.99, 7.64, 7.65, "kg"),
    item("Banany luz", "Owoce", 1.646, 6.99, 4.92, 6.59, "kg"),
    item("Tuńczyk stek w sosie", "Mięso", 4, 7.11, 28.44),
    item("Pieczarki brązowe 300g", "Warzywa", 1, 5.99, 5.99),
    item("Jabłka Kujawskie luz", "Owoce", 0.804, 4.79, 3.85, null, "kg"),
    item("Czosnek luz", "Warzywa", 0.110, 19.90, 2.19, null, "kg"),
    item("Mozzarella 220g", "Nabiał", 2, 2.54, 5.08),
    item("Papryka słodka mielona 30g", "Przyprawy", 1, 1.29, 1.29),
    item("Liście laurowe", "Przyprawy", 1, 1.29, 1.29),
    item("Imbir luz", "Warzywa", 0.024, 24.90, 0.60, null, "kg"),
  ]),

  // ── #15 Lidl, 2026-05-16 — 23,65 PLN ──
  r(15, { ...LIDL_SZARYCH, date: "2026-05-16" }, [
    item("Banany luz", "Owoce", 1.734, 6.99, 5.18, 6.94, "kg"),
    item("Brzoskwinie luz", "Owoce", 0.358, 19.99, 4.30, 2.86, "kg"),
    item("Reklamówka 50µ", "Inne", 1, 0.65, 0.65),
    item("Chipsy Przysnacki", "Słodycze", 1, 6.49, 6.49),
    item("Chleb żytni 450g", "Pieczywo", 1, 3.69, 3.69),
    item("Bułka orkiszowa 60%", "Pieczywo", 2, 1.67, 3.34),
  ]),

  // ── #16 Kaufland, 2026-05-13 — 119,39 PLN (+3,00 kaucja PET) ──
  r(16, { ...KAUFLAND_AK, date: "2026-05-13" }, [
    item("K-SM Mięso z uda kurczak", "Mięso", 0.705, 21.98, 15.49, null, "kg"),
    item("K-SM Mięso z uda kurczak", "Mięso", 0.723, 21.98, 15.89, null, "kg"),
    item("K-SM Mięso z uda kurczak", "Mięso", 0.644, 21.98, 14.16, null, "kg"),
    item("Piątnica Śmietana 400ml", "Nabiał", 1, 7.15, 7.15),
    item("Rodowita Niegazowana 1,5 l", "Napoje", 6, 1.99, 7.96, 3.98),
    item("Mango", "Owoce", 1, 4.99, 4.99),
    item("Imbir luz", "Warzywa", 0.242, 24.90, 4.57, 1.46, "kg"),
    item("Cytryny siatka 500g", "Owoce", 1, 5.99, 5.99),
    item("Czosnek 200g", "Warzywa", 1, 7.99, 7.99),
    item("Melon żółty", "Owoce", 1.358, 8.99, 12.21, null, "kg"),
    item("Ciabatta 75g", "Pieczywo", 1, 1.14, 1.14),
    item("Kajzerka pszenna 55g", "Pieczywo", 2, 0.29, 0.58),
    item("Pomidory krojone 400g", "Warzywa", 3, 3.99, 11.97),
    item("Dawtona Passata 690g", "Warzywa", 1, 6.29, 6.29),
    item("Kaucja butelki PET", "Inne", 6, 0.50, 3.00),
  ]),

  // ── #17 Lidl, 2026-05-19 — 41,31 PLN ──
  r(17, { ...LIDL_SZARYCH, date: "2026-05-19" }, [
    item("Rzodkiewki pęczek", "Warzywa", 2, 2.99, 2.98, 3.00),
    item("Chusteczki higieniczne 3-warstwowe", "Chemia", 1, 3.59, 3.59),
    item("Dawtona Sok 100% 0,3 l", "Napoje", 2, 1.99, 3.98),
    item("Ser sałatkowy 200g", "Nabiał", 1, 8.61, 8.61),
    item("Cebula dymka pęczek", "Warzywa", 1, 2.99, 2.99),
    item("Rukola", "Warzywa", 1, 4.99, 4.99),
    item("Śmietanka 30% 330g", "Nabiał", 1, 5.49, 5.49),
    item("Bio Napój sojowy", "Napoje", 1, 4.99, 4.99),
    item("Chleb żytni 450g", "Pieczywo", 1, 3.69, 3.69),
  ]),

  // ── #18 Rossmann (Kościuszki), 2026-05-13 — 16,99 PLN ──
  r(18, { ...ROSSMANN_KOSCIUSZKI, date: "2026-05-13" }, [
    item("Nivea B&W Invisible", "Kosmetyki", 1, 24.49, 16.99, 7.50),
  ]),

  // ── #19 Biedronka, 2026-05-19 — 15,97 PLN ──
  r(19, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-19" }, [
    item("Czekolada Ritter Alpejski 100g", "Słodycze", 2, 8.99, 11.98, 6.00),
    item("Baton Kinder White 39g", "Słodycze", 1, 3.99, 3.99),
  ]),

  // ── #20 Kłos Piekarnia (Biedronek), 2026-05-21 — 2,40 PLN ──
  r(20, { ...KLOS_BIEDRONEK, date: "2026-05-21" }, [
    item("Bułeczka szkolna", "Pieczywo", 2, 1.20, 2.40),
  ]),

  // ── #21 Kłos Piekarnia (Armii Krajowej), 2026-05-19 — 5,40 PLN ──
  r(21, { ...KLOS_AK, date: "2026-05-19" }, [
    item("Bułka maślana bez maku, pakiet 3+1", "Pieczywo", 1, 5.40, 5.40),
  ]),

  // ── #22 Rossmann (Bażantów), 2026-05-19 — 8,49 PLN ──
  r(22, { ...ROSSMANN_BAZANTOW, date: "2026-05-19" }, [
    item("Ziaja żel pod prysznic", "Kosmetyki", 1, 8.49, 8.49),
  ]),

  // ── #23 Pod Belkami (Mikołów), 2026-05-15 — 95,00 PLN ──
  r(23, { ...POD_BELKAMI, date: "2026-05-15" }, [
    item("Naleśniki z łososiem", "Restauracje", 2, 46.00, 92.00),
    item("Opakowanie na wynos", "Restauracje", 2, 1.50, 3.00),
  ]),

  // ── #24 Świeżyzna (drób), 2026-05-19 — 13,44 PLN ──
  r(24, { ...SWIEZYZNA, date: "2026-05-19" }, [
    item("Filet z kurczaka", "Mięso", 0.585, 22.98, 13.44, null, "kg"),
  ]),

  // ── #25 Konach (drób), 2026-05-13 — 32,89 PLN ──
  r(25, { ...KONACH, date: "2026-05-13" }, [
    item("Filet z kurczaka", "Mięso", 1.100, 29.90, 32.89, null, "kg"),
  ]),

  // ── #26 McDonald's (Mikołów), 2026-05-18 — 34,20 PLN ──
  r(26, { ...MCDONALDS_MIKOLOW, date: "2026-05-18" }, [
    item("Big Mac M", "Restauracje", 1, 17.80, 17.80),
    item("Frytki M", "Restauracje", 1, 8.10, 8.10),
    item("0.4 Cola Zero", "Restauracje", 1, 8.30, 8.30),
  ]),

  // ── #27 Circle K (paliwo), data niepodana → 2026-05-15 — 100,00 PLN ──
  r(27, { ...CIRCLE_K, date: "2026-05-15" }, [
    item("Paliwo", "Paliwo", 1, 100.00, 100.00),
  ]),

  // ── #28 Biedronka, 2026-05-21 — 53,52 PLN (+3,00 kaucja) ──
  r(28, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-21" }, [
    item("Polaris L. Gaz 1,5 l", "Napoje", 6, 1.19, 7.14),
    item("Hummus Klasyczny 160g", "Inne", 1, 4.19, 3.34, 0.85),
    item("Hummus Paprykowy 160g", "Inne", 1, 4.19, 3.35, 0.84),
    item("Serek Wiejski 200g", "Nabiał", 2, 2.99, 5.98),
    item("Ser Rycerski Świętokrzyski 135g", "Nabiał", 2, 4.49, 4.49, 4.49),
    item("Czekolada Ritter Alpejski 100g", "Słodycze", 2, 8.99, 11.98, 6.00),
    item("Awokado Hass", "Owoce", 2, 6.99, 6.98, 7.00),
    item("Chleb Mąka Zaparz 400g", "Pieczywo", 1, 3.49, 3.49),
    item("Pomidor malinowy Polska luz", "Warzywa", 0.540, 13.99, 3.77, 3.78, "kg"),
    item("Kaucja butelki plastikowe", "Inne", 6, 0.50, 3.00),
  ]),

  // ── #29 Biedronka (Mikołów), 2026-05-19 — 20,48 PLN (+1,50 kaucja) ──
  r(29, { ...BIEDRONKA_PODLESKA, date: "2026-05-19" }, [
    item("Sok Pomidorowy Vital Fres 1 l", "Napoje", 1, 8.99, 6.10, 2.89),
    item("Sok Mandarynkowy Vital Fres 1 l", "Napoje", 1, 8.99, 6.10, 2.89),
    item("Sok Mandarynka-Mango-Marakuja Vital Fres 1 l", "Napoje", 1, 9.99, 6.78, 3.21),
    item("Kaucja butelki plastikowe", "Inne", 3, 0.50, 1.50),
  ]),

  // ── #30 Biedronka, 2026-05-16 — 26,05 PLN ──
  r(30, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-16" }, [
    item("Torba T-shirt", "Inne", 1, 0.79, 0.79),
    item("Krem Smooth 500g", "Nabiał", 1, 13.49, 13.49),
    item("Pietruszka natka", "Warzywa", 1, 1.89, 1.89),
    item("Kefir Krasnystaw 420g", "Nabiał", 1, 2.89, 2.89),
    item("Ziemniaki Jadalne Mączyste 1,5 kg", "Warzywa", 1, 6.99, 6.99),
  ]),

  // ── #31 Biedronka, 2026-05-15 — 20,28 PLN (+6,00 kaucja) ──
  r(31, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-15" }, [
    item("Polaris L. Gaz 1,5 l", "Napoje", 12, 1.19, 14.28),
    item("Kaucja butelki plastikowe", "Inne", 12, 0.50, 6.00),
  ]),

  // ── #32 Biedronka, 2026-05-14 — 33,54 PLN ──
  r(32, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-14" }, [
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Pomidor malinowy Polska luz", "Warzywa", 0.576, 16.99, 4.60, 5.19, "kg"),
    item("Ser Mozzarella 125g", "Nabiał", 2, 2.99, 4.48, 1.50),
    item("Wafel Prince Polo 45g", "Słodycze", 1, 2.69, 2.69),
    item("Por", "Warzywa", 1, 4.99, 4.99),
    item("Cebula dymka", "Warzywa", 1, 2.99, 2.99),
    item("Szczypiorek/Natka", "Warzywa", 1, 2.49, 2.49),
    item("Ogórek szklarniowy luz", "Warzywa", 0.368, 8.99, 1.47, 1.84, "kg"),
    item("Awokado Hass", "Owoce", 2, 5.99, 5.98, 6.00),
  ]),

  // ── #33 Biedronka, 2026-05-12 — 76,13 PLN (+1,00 kaucja) ──
  r(33, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-12" }, [
    item("Polaris N. Gaz 1,5 l", "Napoje", 2, 1.19, 2.38),
    item("Sos Marin Gusto Bella 600g", "Przyprawy", 1, 8.99, 8.99),
    item("Borówka Mrożona Krainy 500g", "Owoce", 2, 13.99, 18.65, 9.33),
    item("Brzoskwinia Mrożona Krainy 500g", "Owoce", 1, 13.99, 9.33, 4.66),
    item("Mandarynka 1 kg", "Owoce", 1, 8.99, 5.99, 3.00),
    item("Serek Wiejski 200g", "Nabiał", 3, 2.99, 8.97),
    item("Burrata Gusto Bella 125g", "Nabiał", 2, 7.49, 11.98, 3.00),
    item("Pieczywo Chrupkie Pełnoziarniste 250g", "Pieczywo", 1, 4.99, 4.99),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Kaucja butelki plastikowe", "Inne", 2, 0.50, 1.00),
  ]),

  // ── #34 Biedronka (3× 2026-05-11 łącznie), 39,18 PLN ──
  r(34, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-11" }, [
    item("Pierogi z serem 400g", "Zboża", 2, 7.49, 11.98, 3.00),
    item("Burrata Gusto Bella 125g", "Nabiał", 2, 7.49, 11.98, 3.00),
    item("Hummus Klasyczny 160g", "Inne", 2, 4.19, 8.38),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Cebula dymka", "Warzywa", 1, 2.99, 2.99),
  ]),

  // ── #35 Biedronka, 2026-05-07 — 30,57 PLN (+1,00 kaucja) ──
  r(35, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-07" }, [
    item("Sok Pomidorowy Vital Fres 1 l", "Napoje", 2, 8.99, 13.47, 4.51),
    item("Twaróg Półtłusty 250g", "Nabiał", 2, 3.95, 5.43, 2.47),
    item("Papryka Słodka Czerwona luz", "Warzywa", 0.435, 16.99, 4.35, 3.04, "kg"),
    item("Chleb Żytni Niski IG 450g", "Pieczywo", 1, 3.85, 3.85),
    item("Twaróg Klinkowy Chudy 250g", "Nabiał", 1, 3.59, 2.47, 1.12),
    item("Kaucja butelki plastikowe", "Inne", 2, 0.50, 1.00),
  ]),

  // ── #36 Biedronka, 2026-05-04 — 33,11 PLN (+9,00 kaucja) ──
  r(36, { ...BIEDRONKA_RADOCKIEGO, date: "2026-05-04" }, [
    item("Wafel Prince Polo 45g", "Słodycze", 1, 2.69, 2.69),
    item("Polaris L. Gaz 1,5 l", "Napoje", 12, 1.19, 14.28),
    item("Polaris Gaz 1,5 l", "Napoje", 6, 1.19, 7.14),
    item("Kaucja butelki plastikowe", "Inne", 18, 0.50, 9.00),
  ]),
];
