/**
 * Seed script to populate Firestore config/appConfig document.
 * Run once to initialize the config collection.
 *
 * Usage: node scripts/seedConfig.js
 *
 * Requires: firebase-admin package and a service account key.
 * Alternatively, use the Firebase console to manually create the document.
 */

// Config data to seed into Firestore config/appConfig
const appConfig = {
  categories: {
    // Grocery / food (Spożywcze)
    "Nabiał":      { color: "#0369A1", icon: "🥛", group: "Spożywcze" },
    "Mięso":       { color: "#DC2626", icon: "🥩", group: "Spożywcze" },
    "Warzywa":     { color: "#16A34A", icon: "🥦", group: "Spożywcze" },
    "Owoce":       { color: "#EA580C", icon: "🍎", group: "Spożywcze" },
    "Napoje":      { color: "#6D28D9", icon: "🥤", group: "Spożywcze" },
    "Pieczywo":    { color: "#D97706", icon: "🍞", group: "Spożywcze" },
    "Zboża":       { color: "#B45309", icon: "🌾", group: "Spożywcze" },
    "Słodycze":    { color: "#BE185D", icon: "🍬", group: "Spożywcze" },
    "Chemia":      { color: "#0891B2", icon: "🧹", group: "Spożywcze" },
    // Bills & services (Rachunki)
    "Paliwo":      { color: "#F59E0B", icon: "⛽", group: "Rachunki" },
    "Subskrypcje": { color: "#7C3AED", icon: "📱", group: "Rachunki" },
    "Restauracje": { color: "#EF4444", icon: "🍽️", group: "Rachunki" },
    "Transport":   { color: "#8B5CF6", icon: "🚗", group: "Rachunki" },
    "Rozrywka":    { color: "#F97316", icon: "🎬", group: "Rachunki" },
    // One-time purchases (Jednorazowe)
    "Elektronika": { color: "#3B82F6", icon: "💻", group: "Jednorazowe" },
    "Odzież":      { color: "#EC4899", icon: "👔", group: "Jednorazowe" },
    "Zdrowie":     { color: "#10B981", icon: "💊", group: "Jednorazowe" },
    "Narzędzia":   { color: "#92400E", icon: "🔧", group: "Jednorazowe" },
    "Meble":       { color: "#78350F", icon: "🛋️", group: "Jednorazowe" },
    "AGD":         { color: "#1E3A5F", icon: "🫙", group: "Jednorazowe" },
    "Ogród":       { color: "#166534", icon: "🌿", group: "Jednorazowe" },
    "Zwierzęta":   { color: "#713F12", icon: "🐾", group: "Jednorazowe" },
    "Podróże":     { color: "#0C4A6E", icon: "✈️", group: "Jednorazowe" },
    "Sport":       { color: "#064E3B", icon: "🏃", group: "Jednorazowe" },
    "Kosmetyki":   { color: "#831843", icon: "💄", group: "Jednorazowe" },
    "Edukacja":    { color: "#1E1B4B", icon: "📚", group: "Jednorazowe" },
    "Prezenty":    { color: "#4A1D96", icon: "🎁", group: "Jednorazowe" },
    "Dom":         { color: "#374151", icon: "🏠", group: "Jednorazowe" },
    "Inne":        { color: "#6B7280", icon: "📦", group: "Jednorazowe" },
  },
  categoryGroups: {
    "Spożywcze":   ["Nabiał","Mięso","Warzywa","Owoce","Napoje","Pieczywo","Zboża","Słodycze","Chemia"],
    "Rachunki":    ["Paliwo","Subskrypcje","Transport","Rozrywka","Restauracje"],
    "Jednorazowe": ["Elektronika","Odzież","Zdrowie","Narzędzia","Meble","AGD","Ogród","Zwierzęta","Podróże","Sport","Kosmetyki","Edukacja","Prezenty","Dom","Inne"],
  },
  defaultStores: ["Biedronka","Auchan","Lidl","Netto","InterMarche","Kaufland","Leroy Merlin","Circle K","Shell","BP","Orlen","OBI"],
  defaultStoreLocations: [
    { store: "Lidl",      label: "Lidl Bazantowo",      address: "Szarych Szeregów 3A",   zip_code: "40-750", city: "Katowice" },
    { store: "Biedronka", label: "Biedronka Bazantowo",  address: "ul. Radockiego 150",    zip_code: "40-645", city: "Katowice" },
    { store: "Lidl",      label: "Lidl Zarzecze",        address: "Grota Roweckiego 2F",   zip_code: "40-748", city: "Katowice" },
    { store: "Auchan",    label: "Auchan Mikołów",       address: "Gliwicka 3",            zip_code: "43-190", city: "Mikołów" },
    { store: "Netto",     label: "Netto Bazantowo",      address: "Armii Krajowej 208",    zip_code: "40-750", city: "Katowice" },
  ],
  fxRates: { PLN: 1, EUR: 0.234, USD: 0.252 },
  fxSymbols: { PLN: "zł", EUR: "€", USD: "$" },
};

console.log("Firestore config/appConfig document data:");
console.log(JSON.stringify(appConfig, null, 2));
console.log("\nTo seed this data:");
console.log("1. Go to Firebase Console > Firestore > Create collection 'config'");
console.log("2. Create document 'appConfig' with the above data");
console.log("3. Or use firebase-admin SDK to write it programmatically");
