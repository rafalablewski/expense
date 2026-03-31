// DeepSeek API (OpenAI-compatible chat completions) for receipt analysis

import { parseJsonFromAssistantText } from "./aiResponse";
import { buildParseTextReceiptPrompt, buildParseJsonReceiptPrompt } from "./receiptPrompts";

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

const VISION_UNSUPPORTED_MSG =
  "Skan zdjęcia paragonu nie jest obsługiwany przez wybrany model DeepSeek. Wklej tekst paragonu, zaimportuj JSON lub w ustawieniach wybierz Anthropic (Claude) do zdjęć.";

function apiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function handleApiResponse(res) {
  if (res.ok) return;
  if (res.status === 401) throw new Error("Nieprawidłowy klucz API — sprawdź lub zaktualizuj klucz w ustawieniach (ikona klucza)");
  if (res.status === 402) {
    throw new Error(
      "DeepSeek API: niewystarczające saldo (HTTP 402). W panelu DeepSeek sprawdź doładowanie konta API i limity; po zaksięgowaniu środków spróbuj ponownie."
    );
  }
  let detail = "";
  try {
    const body = await res.json();
    detail = body.error?.message || JSON.stringify(body.error) || "";
  } catch {}
  throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
}

function extractChoiceText(data) {
  const c = data.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c.map(part => (typeof part === "string" ? part : part?.text || "")).join("");
  }
  return "";
}

async function chatCompletion(apiKey, messages, maxTokens) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
      stream: false,
    }),
  });
  await handleApiResponse(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return data;
}

export async function deepseekChat(prompt, apiKey, maxTokens = 1024) {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const data = await chatCompletion(apiKey, [{ role: "user", content: prompt }], maxTokens);
  const text = extractChoiceText(data);
  if (!text?.trim()) throw new Error("Pusta odpowiedź z API DeepSeek.");
  return text;
}

export async function scanReceipt(_b64, _mt, apiKey, _correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  throw new Error(VISION_UNSUPPORTED_MSG);
}

export async function parseTextReceipt(text, apiKey, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const data = await chatCompletion(
    apiKey,
    [{ role: "user", content: buildParseTextReceiptPrompt(text, correctionsHint) }],
    8192
  );
  return parseJsonFromAssistantText(extractChoiceText(data));
}

export async function parseJsonReceipt(jsonContent, apiKey, source = null, correctionsHint = "") {
  if (!apiKey) throw new Error("Brak klucza API — ustaw go w ustawieniach (ikona klucza)");
  const data = await chatCompletion(
    apiKey,
    [{ role: "user", content: buildParseJsonReceiptPrompt(jsonContent, source, correctionsHint) }],
    8192
  );
  return parseJsonFromAssistantText(extractChoiceText(data));
}
