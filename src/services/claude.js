// Claude API integration for receipt scanning and text parsing

import { parseJsonFromAssistantText } from "./aiResponse";
import { buildScanReceiptPrompt, buildParseTextReceiptPrompt, buildParseJsonReceiptPrompt } from "./receiptPrompts";

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
  return parseJsonFromAssistantText(extractText(data));
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
  const textPrompt = buildScanReceiptPrompt(correctionsHint);
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
          { type: "text", text: textPrompt },
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
        content: buildParseTextReceiptPrompt(text, correctionsHint),
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

  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: buildParseJsonReceiptPrompt(jsonContent, source, correctionsHint),
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
