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
        content: `Parse the following Polish shopping list / receipt text into structured JSON. Each line is a product. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

{
  "store": string | null,
  "address": string | null,
  "zip_code": string | null,
  "city": string | null,
  "date": "${new Date().toISOString().slice(0, 10)}",
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
- Each line is a separate product. Extract name, quantity, unit, and price from the text.
- If price is missing for a product, set total_price to 0.
- If quantity is mentioned (e.g. "2kg", "3 szt", "3 jogurty"), extract it. Otherwise default to 1.
- Calculate unit_price = total_price / quantity when both are known.
- "total" = sum of all total_price values.
- address: Extract the store's street address if present. Return null if not found.
- zip_code: Extract the postal/zip code if present. Return null if not found.
- city: Extract the city name if present (e.g. "Katowice", "Mikołów"). For e-commerce stores return null. Return null if not found.
- Categorize products into the correct Polish category.
- Prices = plain numbers (4.99). Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice (ryż, kasza, kasza pęczak, kasza jęczmienna, kasza gryczana, makaron, mąka, płatki) → category "Zboża". These are grain/carb products, NOT vegetables or bread.
- Bread, rolls, buns, bagels (chleb, bułka, rogal, bajgiel) → category "Pieczywo".${correctionsHint}

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
