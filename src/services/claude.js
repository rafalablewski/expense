// Claude API integration for receipt scanning and text parsing

export async function scanReceipt(b64, mt, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
          {
            type: "text",
            text: `Scan this Polish receipt. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

{
  "store": string | null,
  "address": string | null,
  "zip_code": string | null,
  "city": string | null,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number,
      "discount": number | null,
      "discount_label": string | null,
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Zboża"|"Słodycze"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne"
    }
  ],
  "total": number | null,
  "total_discounts": number | null
}

Rules:
- date MUST be in YYYY-MM-DD format. Extract from receipt header/footer. NEVER return null for date.
- address: Extract the store's street address from the receipt header (e.g. "ul. Warszawska 15"). Return null if not found.
- zip_code: Extract the postal/zip code (e.g. "00-001"). Return null if not found.
- city: Extract the city name from the receipt header (e.g. "Katowice", "Mikołów"). For e-commerce stores return null. Return null if not found.
- Product names: read carefully, expand abbreviations into readable Polish names (e.g. "PomidGustBel400g" → "Pomidory Gusto Bello 400g").
- Categorize food products correctly: tomatoes/vegetables → "Warzywa", fruits → "Owoce", etc.
- Prices = plain numbers (4.99). Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice (ryż, kasza, kasza pęczak, kasza jęczmienna, kasza gryczana, makaron, mąka, płatki) → category "Zboża". These are grain/carb products, NOT vegetables or bread.
- Bread, rolls, buns, bagels (chleb, bułka, rogal, bajgiel) → category "Pieczywo".${correctionsHint}`
          }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`\s*$/i, "").trim());
}

export async function parseTextReceipt(text, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Parse the following Polish text into structured JSON. The text may be either a full receipt (paragon fiskalny) or a simple shopping list. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

{
  "store": string | null,
  "address": string | null,
  "zip_code": string | null,
  "city": string | null,
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number,
      "discount": number | null,
      "discount_label": string | null,
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Zboża"|"Słodycze"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne"
    }
  ],
  "total": number | null,
  "total_discounts": number | null
}

Rules:
- The text can be a FULL RECEIPT (paragon fiskalny) or a simple shopping list. Detect the format automatically.
- For FULL RECEIPTS (containing store headers, NIP, product codes, tax summaries, payment info):
  * Extract store name, address, zip_code, city from the receipt header.
  * date MUST be in YYYY-MM-DD format. Extract from receipt header/footer (e.g. "2026-03-04 14:15" → "2026-03-04"). NEVER return null for date.
  * Only extract product lines — IGNORE tax summaries (PTU, SPRZEDAZ OPODATKOWANA), payment lines (GOTOWKA, RESZTA), totals (SUMA PLN), NIP, separator lines (===, ---), transaction metadata, and other non-product lines.
  * Product lines typically look like: "PRODUCT_NAME CODE    QTY xPRICE    TOTAL_PRICETAX_LETTER" — extract name, quantity, unit_price, and total_price from these.
  * For weighed products (e.g. "1,838 x34,90    64,15C"), quantity is the weight in kg, unit is "kg".
  * For counted products (e.g. "1 x19,99    19,99C"), quantity is the count, unit is "szt".
  * The rightmost number before the tax letter (A/B/C) is total_price. The "QTY xPRICE" part gives quantity and unit_price.
  * Use the "SUMA PLN" line for the "total" field if present.
  * Product names: expand abbreviations into readable Polish names (e.g. "MIELONE WO" → "Mielone wołowe", "FILET Z KU" → "Filet z kurczaka", "WATROBA Z K" → "Wątroba z kurczaka", "SOL Z KOPA" → "Sól z kopalnią/Sól kopalniana", "CUKIER TRZC" → "Cukier trzcinowy", "FASOLA CZA" → "Fasola czarna", "PAPRYKA KO" → "Papryka konserwowa", "CIECIERZYC" → "Ciecierzyca", "KETCHUP LA" → "Ketchup łagodny", "CHRZAN TAR" → "Chrzan tarty", "SOS BBQ CH" → "Sos BBQ", "PLATKI JEC" → "Płatki jęczmienne", "SOCZEWICA" → "Soczewica", "SER TWARDY" → "Ser twardy", "SEREK WIE L" → "Serek wiejski lekki", "SER ZLOTY" → "Ser złoty", "PLATKI OWS" → "Płatki owsiane", "BULKA GRIL" → "Bułka grillowa", "MAKARON LA" → "Makaron lasagne", "SEREK Z CE" → "Serek z cebulą", "CHIPSY AUC" → "Chipsy Auchan"). Use context and common sense to expand truncated product names into natural Polish.
- For SIMPLE SHOPPING LISTS (freeform text like "mleko 2zł"):
  * Each line is a separate product. Extract name, quantity, unit, and price.
  * If price is missing, set total_price to 0.
  * If no date is found, use today: "${new Date().toISOString().slice(0, 10)}".
  * "total" = sum of all total_price values.
- Calculate unit_price = total_price / quantity when both are known.
- Categorize products into the correct Polish category.
- Prices = plain numbers (4.99). Use dot as decimal separator. Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice (ryż, kasza, kasza pęczak, kasza jęczmienna, kasza gryczana, makaron, mąka, płatki) → category "Zboża". These are grain/carb products, NOT vegetables or bread.
- Bread, rolls, buns, bagels (chleb, bułka, rogal, bajgiel) → category "Pieczywo".
- Meat products (mielone, filet, serce, wątroba, kurczak, wołowina, wieprzowina) → category "Mięso".
- Dairy (ser, serek, mleko, jogurt, śmietana, masło) → category "Nabiał".
- Sauces, ketchup, mustard, horseradish → category "Inne" (condiments).
- Salt, sugar, spices → category "Inne".
- Chips, snacks → category "Słodycze".
- Canned/dried legumes (fasola, ciecierzyca, soczewica) → category "Warzywa".${correctionsHint}

Text to parse:
${text}`
      }]
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`\s*$/i, "").trim());
}

export function getCorrectionsHint(corrections) {
  const nameEntries = Object.entries(corrections.names || {});
  const catEntries = Object.entries(corrections.categories || {});
  if (!nameEntries.length && !catEntries.length) return "";
  let hint = "\n\nUser corrections from past receipts — apply these:";
  if (nameEntries.length) hint += "\nName fixes: " + nameEntries.slice(-30).map(([k,v]) => {
    const arr = Array.isArray(v) ? v : [v];
    return arr.length === 1 ? `"${k}" → "${arr[0]}"` : `"${k}" → one of [${arr.map(x => `"${x}"`).join(", ")}] (ambiguous, pick best match based on context)`;
  }).join(", ");
  if (catEntries.length) hint += "\nCategory fixes: " + catEntries.slice(-30).map(([k,v]) => `"${k}" → ${v}`).join(", ");
  return hint;
}
