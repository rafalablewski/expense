// DeepSeek API integration (OpenAI-compatible API)

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

function apiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

async function handleApiResponse(res) {
  if (res.ok) return;
  if (res.status === 401) throw new Error("Nieprawidłowy klucz API DeepSeek — sprawdź lub zaktualizuj klucz w ustawieniach (ikona klucza)");
  let detail = "";
  try {
    const body = await res.json();
    detail = body.error?.message || JSON.stringify(body.error) || "";
  } catch {}
  throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
}

function extractText(data) {
  return data.choices?.[0]?.message?.content || "";
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

export async function deepseekChat(prompt, apiKey, maxTokens = 1024) {
  if (!apiKey) throw new Error("Brak klucza API DeepSeek — ustaw go w ustawieniach (ikona klucza)");
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

export async function deepseekScanReceipt(b64, mt, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API DeepSeek — ustaw go w ustawieniach (ikona klucza)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mt};base64,${b64}` } },
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

export async function deepseekParseTextReceipt(text, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API DeepSeek — ustaw go w ustawieniach (ikona klucza)");
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
  * Product names: expand abbreviations into readable Polish names.
- For SIMPLE SHOPPING LISTS (freeform text like "mleko 2zł"):
  * Each line is a separate product. Extract name, quantity, unit, and price.
  * If price is missing, set total_price to 0.
  * If no date is found, use today: "${new Date().toISOString().slice(0, 10)}".
  * "total" = sum of all total_price values.
- For E-COMMERCE ORDERS (Allegro, Amazon, online shops):
  * Extract product name, quantity, unit_price, and total_price.
  * Delivery lines go into delivery_cost, NOT as items.
- delivery_cost: If there is a delivery/shipping fee, extract the listed price as a number. Do NOT add delivery as an item. Return null if no delivery fee.
- delivery_free: Set to true if delivery is explicitly free or fully discounted. Default false.
- Calculate unit_price = total_price / quantity when both are known.
- Categorize products into the correct Polish category.
- Prices = plain numbers (4.99). Use dot as decimal separator. Discounts = positive numbers. Missing qty = 1.
- Grains, cereals, pasta, flour, rice → category "Zboża". Bread, rolls → "Pieczywo". Spices → "Przyprawy". Oils → "Oleje".${correctionsHint}

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

export async function deepseekParseJsonReceipt(jsonContent, apiKey, source = null, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API DeepSeek — ustaw go w ustawieniach (ikona klucza)");

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
- Detect the JSON structure automatically. Common formats include: Polish fiscal e-paragon JSON, Lidl Plus receipt export, Biedronka e-receipt, generic POS data, etc.
- Map whatever fields exist to the items array.
- Product names: expand abbreviations into readable Polish names.
- date MUST be in YYYY-MM-DD format. NEVER return null for date.
- Prices = plain numbers (4.99). Use dot as decimal separator. Discounts = positive numbers. Missing qty = 1.
- Categorize products into the correct Polish category.
- Grains, cereals, pasta, flour, rice → "Zboża". Bread, rolls → "Pieczywo". Spices → "Przyprawy". Oils → "Oleje".
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
