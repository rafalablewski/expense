// Default configuration values — used as fallbacks if Firestore config is unavailable.
// These will be loaded dynamically from Firestore config/appConfig in production.

export const CATS = {
  // Grocery / food
  "Nabiał":        "#0369A1",
  "Mięso":         "#DC2626",
  "Warzywa":       "#16A34A",
  "Owoce":         "#EA580C",
  "Napoje":        "#6D28D9",
  "Pieczywo":      "#D97706",
  "Zboża":         "#B45309",
  "Słodycze":      "#BE185D",
  "Przyprawy":     "#A16207",
  "Oleje":         "#CA8A04",
  "Chemia":        "#0891B2",
  // Bills & services
  "Paliwo":        "#F59E0B",
  "Subskrypcje":   "#7C3AED",
  "Restauracje":   "#EF4444",
  "Transport":     "#8B5CF6",
  "Dostawa":       "#7E22CE",
  "Rozrywka":      "#F97316",
  // One-time purchases
  "Elektronika":   "#3B82F6",
  "Odzież":        "#EC4899",
  "Zdrowie":       "#10B981",
  "Narzędzia":     "#92400E",
  "Meble":         "#78350F",
  "AGD":           "#1E3A5F",
  "Ogród":         "#166534",
  "Zwierzęta":     "#713F12",
  "Podróże":       "#0C4A6E",
  "Sport":         "#064E3B",
  "Kosmetyki":     "#831843",
  "Edukacja":      "#1E1B4B",
  "Prezenty":      "#4A1D96",
  "Dom":           "#374151",
  "Inne":          "#6B7280",
};

export const ALL_CATS = Object.keys(CATS);

export const CAT_GROUPS = {
  "Spożywcze":   ["Nabiał","Mięso","Warzywa","Owoce","Napoje","Pieczywo","Zboża","Słodycze","Przyprawy","Oleje","Chemia"],
  "Rachunki":    ["Paliwo","Subskrypcje","Transport","Dostawa","Rozrywka","Restauracje"],
  "Jednorazowe": ["Elektronika","Odzież","Zdrowie","Narzędzia","Meble","AGD","Ogród","Zwierzęta","Podróże","Sport","Kosmetyki","Edukacja","Prezenty","Dom","Inne"],
};

export const CAT_ICONS = {
  "Nabiał":"🥛","Mięso":"🥩","Warzywa":"🥦","Owoce":"🍎","Napoje":"🥤","Pieczywo":"🍞","Zboża":"🌾","Słodycze":"🍬","Przyprawy":"🧂","Oleje":"🫒","Chemia":"🧹",
  "Paliwo":"⛽","Subskrypcje":"📱","Restauracje":"🍽️","Transport":"🚗","Dostawa":"🚚","Rozrywka":"🎬",
  "Elektronika":"💻","Odzież":"👔","Zdrowie":"💊","Narzędzia":"🔧","Meble":"🛋️","AGD":"🫙",
  "Ogród":"🌿","Zwierzęta":"🐾","Podróże":"✈️","Sport":"🏃","Kosmetyki":"💄","Edukacja":"📚","Prezenty":"🎁","Dom":"🏠","Inne":"📦",
};

export const DEFAULT_STORES = ["Biedronka","Auchan","Lidl","Netto"];

export const DEFAULT_STORE_LOCATIONS = [
  { store: "Lidl",      label: "Lidl Bazantowo",      address: "Szarych Szeregów 3A",   zip_code: "40-750", city: "Katowice" },
  { store: "Biedronka", label: "Biedronka Bazantowo",  address: "ul. Radockiego 150",    zip_code: "40-645", city: "Katowice" },
  { store: "Lidl",      label: "Lidl Zarzecze",        address: "Grota Roweckiego 2F",   zip_code: "40-748", city: "Katowice" },
  { store: "Auchan",    label: "Auchan Mikołów",       address: "Gliwicka 3",            zip_code: "43-190", city: "Mikołów" },
  { store: "Netto",     label: "Netto Bazantowo",      address: "Armii Krajowej 208",    zip_code: "40-750", city: "Katowice" },
];

export const REC_CYCLES = ["Miesięcznie", "Tygodniowo", "Rocznie", "Kwartalnie"];

export const MONTH_NAMES = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];

export const FX = { PLN: 1, EUR: 0.234, USD: 0.252 };
export const FX_SYMBOLS = { PLN: "zł", EUR: "€", USD: "$" };
