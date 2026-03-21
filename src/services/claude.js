// Claude API integration for receipt scanning and text parsing

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function apiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

async function handleApiResponse(res) {
  if (res.ok) return;
  if (res.status === 401) throw new Error("Nieprawidłowy klucz API — sprawdź lub zaktualizuj klucz w ustawieniach (ikona klucza)");
  let detail = "";
  try {
    const body = await res.json();
    detail = body.error?.message || JSON.stringify(body.error) || "";
  } catch {}
  throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
}

function extractText(data) {
  return data.content?.find(b => b.type === "text")?.text || "";
}

function parseJsonResponse(data) {
  const raw = extractText(data);
  const cleaned = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("AI zwróciło nieprawidłowy format odpowiedzi. Spróbuj ponownie.");
  }
}

export async function claudeChat(prompt, apiKey, maxTokens = 1024) {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    })
  });
  await handleApiResponse(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return extractText(data);
}

const MAX_B64_BYTES = 4_800_000; // stay under 5 MB API limit

export async function compressImageIfNeeded(b64, mediaType) {
  if (b64.length <= MAX_B64_BYTES) return { b64, mediaType };
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = `data:${mediaType};base64,${b64}`;
  });
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  // Scale down proportionally until base64 fits
  for (let quality = 0.85; quality >= 0.3; quality -= 0.15) {
    const scale = Math.min(1, Math.sqrt(MAX_B64_BYTES / b64.length));
    width = Math.round(img.width * scale);
    height = Math.round(img.height * scale);
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const compressed = dataUrl.split(",")[1];
    if (compressed.length <= MAX_B64_BYTES) {
      return { b64: compressed, mediaType: "image/jpeg" };
    }
    b64 = compressed; // use as new baseline for next iteration's scale calc
  }
  // Last resort: aggressive resize
  canvas.width = Math.round(width * 0.5);
  canvas.height = Math.round(height * 0.5);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const last = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
  return { b64: last, mediaType: "image/jpeg" };
}

export async function scanReceipt(b64, mt, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
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
  "all_addresses": [
    { "address": string | null, "zip_code": string | null, "city": string | null, "type": "store" | "company" | "unknown" }
  ],
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
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Zboża"|"Słodycze"|"Przyprawy"|"Oleje"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Dostawa"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne",
      "fuel_price_per_liter": number | null,
      "fuel_amount_liters": number | null
    }
  ],
  "total": number | null,
  "total_discounts": number | null,
  "delivery_cost": number | null,
  "delivery_free": boolean,
  "voucher": number | null
}

Rules:
- fuel_price_per_liter and fuel_amount_liters: Only for items with category "Paliwo". Extract the per-liter fuel price and the number of liters refueled if visible on the receipt. Return null for non-fuel items or if not found.
- voucher: If there is a coupon, voucher, or bon applied to the entire receipt (not a per-item discount), extract the deducted amount as a positive number. Look for keywords like "bon", "kupon", "voucher", "rabat z kuponu", "kod rabatowy". Return null if none found. This is different from per-item discounts — it applies to the whole receipt total.
- date MUST be in YYYY-MM-DD format. Extract from receipt header/footer. NEVER return null for date.
- all_addresses: Extract ALL addresses found on the receipt. Receipts often have multiple addresses — the registered company/headquarters address and the actual physical store location address. For each address, classify its type: "store" for the physical store/branch location where the purchase was made, "company" for the registered business/headquarters address (often near NIP/tax ID), "unknown" if unclear. Include at least the main address fields (address, zip_code, city) for each.
- address, zip_code, city: Set these to the PHYSICAL STORE location address (type "store"), NOT the registered company address. The store address is typically the branch/location where the purchase happened. If only one address is found, use that. For e-commerce stores, city can be null. Return null if not found.
- delivery_cost: If there is a delivery/shipping fee (dostawa, przesyłka, kurier, wysyłka, shipping), extract the listed price as a number. Return null if no delivery fee.
- delivery_free: Set to true if delivery is explicitly free or fully discounted (darmowa dostawa, free shipping, koszt 0 zł, delivery 0.00). When true, still set delivery_cost to the original listed fee if shown. Default false.
- Product names: read carefully, expand abbreviations into readable Polish names (e.g. "PomidGustBel400g" → "Pomidory Gusto Bello 400g").
- Categorize food products correctly: tomatoes/vegetables → "Warzywa", fruits → "Owoce", etc.
- Prices = plain numbers (4.99). Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice (ryż, kasza, kasza pęczak, kasza jęczmienna, kasza gryczana, makaron, mąka, płatki) → category "Zboża". These are grain/carb products, NOT vegetables or bread.
- Bread, rolls, buns, bagels (chleb, bułka, rogal, bajgiel) → category "Pieczywo".
- Spices, herbs, salt, pepper, seasoning (przyprawy, sól, pieprz, oregano, bazylia, curry, papryka mielona, cynamon, kurkuma) → category "Przyprawy".
- Cooking oils, olive oil, vinegar (olej, oliwa, ocet, olej rzepakowy, olej kokosowy) → category "Oleje".${correctionsHint}`
          }
        ]
      }]
    })
  });
  await handleApiResponse(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return parseJsonResponse(data);
}

export async function parseTextReceipt(text, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `Parse the following Polish text into structured JSON. The text may be either a full receipt (paragon fiskalny), a simple shopping list, or MULTIPLE orders/receipts pasted together. Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

If the text contains MULTIPLE separate orders/receipts (e.g. from different shops, different order confirmations, different dates), return a JSON ARRAY of receipt objects.
If the text contains a SINGLE receipt or shopping list, return a single JSON object (NOT wrapped in an array).

Each receipt object has this schema:
{
  "store": string | null,
  "address": string | null,
  "zip_code": string | null,
  "city": string | null,
  "all_addresses": [
    { "address": string | null, "zip_code": string | null, "city": string | null, "type": "store" | "company" | "unknown" }
  ],
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
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Zboża"|"Słodycze"|"Przyprawy"|"Oleje"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Dostawa"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne",
      "fuel_price_per_liter": number | null,
      "fuel_amount_liters": number | null
    }
  ],
  "total": number | null,
  "total_discounts": number | null,
  "delivery_cost": number | null,
  "delivery_free": boolean,
  "voucher": number | null
}

Rules:
- fuel_price_per_liter and fuel_amount_liters: Only for items with category "Paliwo". Extract the per-liter fuel price and the number of liters refueled if found in the text. Return null for non-fuel items or if not found.
- voucher: If there is a coupon, voucher, or bon applied to the entire receipt (not a per-item discount), extract the deducted amount as a positive number. Look for keywords like "bon", "kupon", "voucher", "rabat z kuponu", "kod rabatowy". Return null if none found.
- all_addresses: Extract ALL addresses found on the receipt/text. Receipts often have multiple addresses — the registered company/headquarters address and the actual physical store location. For each, classify type: "store" for the physical branch location, "company" for registered business address (often near NIP), "unknown" if unclear.
- address, zip_code, city: Set these to the PHYSICAL STORE location address (type "store"), NOT the registered company address. If only one address is found, use that.
- The text can be a FULL RECEIPT (paragon fiskalny), a simple shopping list, or MULTIPLE orders/receipts. Detect the format automatically.
- If there are multiple separate orders (different shops, different order numbers, different confirmation emails), split them into separate receipt objects and return as a JSON array.
- For FULL RECEIPTS (containing store headers, NIP, product codes, tax summaries, payment info):
  * Extract store name, address, zip_code, city from the receipt header. Prefer the physical store address over the registered company address.
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
- For E-COMMERCE ORDERS (Allegro, Amazon, online shops):
  * These contain product names with seller info, total prices like "47,88 zł", quantity notation like "2 × 23,94 zł", delivery method lines (e.g. "Paczkomat InPost", "Kurier DPD") with cost, and a final total.
  * Extract product name (clean, without seller name or item ID codes in parentheses), quantity, unit_price, and total_price.
  * "2 × 23,94 zł" means quantity=2, unit_price=23.94, total_price=47.88.
  * Set store to the marketplace/shop name (e.g. "Allegro", seller name).
  * Delivery lines (e.g. "Paczkomat InPost ... 10,95 zł") go into delivery_cost, NOT as items.
  * Ignore navigation text like "Przejdź do Szczegółów zakupu", "Masz wątpliwości?", etc.
- delivery_cost: If there is a delivery/shipping fee (dostawa, przesyłka, kurier, wysyłka, shipping, transport zamówienia), extract the listed price as a number. Do NOT add delivery as an item — use the delivery_cost field instead. Return null if no delivery fee.
- delivery_free: Set to true if delivery is explicitly free or fully discounted (darmowa dostawa, free shipping, koszt 0 zł, delivery 0.00). When true, still set delivery_cost to the original listed fee if shown. Default false.
- Calculate unit_price = total_price / quantity when both are known.
- Categorize products into the correct Polish category.
- Prices = plain numbers (4.99). Use dot as decimal separator. Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice (ryż, kasza, kasza pęczak, kasza jęczmienna, kasza gryczana, makaron, mąka, płatki) → category "Zboża". These are grain/carb products, NOT vegetables or bread.
- Bread, rolls, buns, bagels (chleb, bułka, rogal, bajgiel) → category "Pieczywo".
- Meat products (mielone, filet, serce, wątroba, kurczak, wołowina, wieprzowina) → category "Mięso".
- Dairy (ser, serek, mleko, jogurt, śmietana, masło) → category "Nabiał".
- Sauces, ketchup, mustard, horseradish → category "Inne" (condiments).
- Spices, herbs, salt, pepper, seasoning mixes (przyprawy, sól, pieprz, oregano, bazylia, curry, papryka mielona, cynamon, kurkuma, kminek, ziele angielskie) → category "Przyprawy".
- Cooking oils, olive oil, vinegar (olej, oliwa, ocet, olej rzepakowy, olej kokosowy, olej słonecznikowy) → category "Oleje".
- Chips, snacks → category "Słodycze".
- Canned/dried legumes (fasola, ciecierzyca, soczewica) → category "Warzywa".${correctionsHint}

Text to parse:
${text}`
      }]
    })
  });
  await handleApiResponse(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return parseJsonResponse(data);
}

export async function parseJsonReceipt(jsonContent, apiKey, source = null, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");

  const sourceHint = source
    ? `\nThis JSON comes from the "${source}" loyalty app/source. Use this context to better interpret field names, product abbreviations, and receipt structure specific to this store chain.`
    : "";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are given a JSON file containing receipt/purchase data. Map it to the structured schema below. The JSON may be from any store, loyalty app, or e-receipt system — detect the format automatically and extract all relevant data.${sourceHint}

Respond with ONLY raw JSON — no markdown, no backticks, no commentary.

If the JSON contains MULTIPLE receipts/transactions, return a JSON ARRAY of receipt objects.
If it contains a SINGLE receipt, return a single JSON object (NOT wrapped in an array).

Each receipt object must follow this schema:
{
  "store": string | null,
  "address": string | null,
  "zip_code": string | null,
  "city": string | null,
  "all_addresses": [
    { "address": string | null, "zip_code": string | null, "city": string | null, "type": "store" | "company" | "unknown" }
  ],
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
      "category": "Nabiał"|"Mięso"|"Warzywa"|"Owoce"|"Napoje"|"Pieczywo"|"Zboża"|"Słodycze"|"Przyprawy"|"Oleje"|"Chemia"|"Paliwo"|"Subskrypcje"|"Restauracje"|"Transport"|"Dostawa"|"Rozrywka"|"Elektronika"|"Odzież"|"Zdrowie"|"Narzędzia"|"Meble"|"AGD"|"Ogród"|"Zwierzęta"|"Podróże"|"Sport"|"Kosmetyki"|"Edukacja"|"Prezenty"|"Dom"|"Inne",
      "fuel_price_per_liter": number | null,
      "fuel_amount_liters": number | null
    }
  ],
  "total": number | null,
  "total_discounts": number | null,
  "delivery_cost": number | null,
  "delivery_free": boolean,
  "voucher": number | null
}

Rules:
- fuel_price_per_liter and fuel_amount_liters: Only for items with category "Paliwo". Extract the per-liter fuel price and the number of liters refueled if found in the JSON data. Return null for non-fuel items or if not found.
- voucher: If there is a coupon, voucher, or bon applied to the entire receipt (not a per-item discount), extract the deducted amount as a positive number. Look for keywords like "bon", "kupon", "voucher", "rabat z kuponu", "kod rabatowy". Return null if none found.
- all_addresses: Extract ALL addresses found in the JSON data. Classify each: "store" for physical store/branch location, "company" for registered business address, "unknown" if unclear.
- address, zip_code, city: Set these to the PHYSICAL STORE location address, NOT the registered company address.
- Detect the JSON structure automatically. Common formats include: Polish fiscal e-paragon JSON, Lidl Plus receipt export, Biedronka e-receipt, generic POS data, etc.
- Map whatever fields exist (e.g. "produkty", "items", "lineItems", "positions", "articles") to the items array.
- Product names: expand abbreviations into readable Polish names. Clean up codes, SKUs, and internal identifiers.
- date MUST be in YYYY-MM-DD format. Extract from any date/timestamp field. NEVER return null for date.
- Prices = plain numbers (4.99). Use dot as decimal separator. Discounts = positive numbers. Missing qty = 1.
- Categorize products into the correct Polish category using the same rules as receipt scanning.
- Grains, cereals, pasta, flour, rice → "Zboża". Bread, rolls → "Pieczywo". Spices → "Przyprawy". Oils → "Oleje".
- If the JSON has VAT/tax information, ignore it — only extract product-level data.
- If delivery/shipping cost exists, use delivery_cost field, NOT as an item.${correctionsHint}

JSON content to parse:
${jsonContent}`
      }]
    })
  });
  await handleApiResponse(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return parseJsonResponse(data);
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
