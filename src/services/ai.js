// AI provider facade: Anthropic (Claude) or DeepSeek

import * as anthropic from "./claude";
import * as deepseek from "./deepseek";

export const AI_PROVIDER = {
  ANTHROPIC: "anthropic",
  DEEPSEEK: "deepseek",
};

/** Normalize stored or passed provider so routing never silently falls through to Anthropic. */
export function normalizeAiProvider(provider) {
  if (provider == null) return AI_PROVIDER.DEEPSEEK;
  const s = String(provider).trim().toLowerCase();
  if (s === AI_PROVIDER.DEEPSEEK) return AI_PROVIDER.DEEPSEEK;
  return AI_PROVIDER.ANTHROPIC;
}

export { getCorrectionsHint, compressImageIfNeeded } from "./claude";

export async function aiChat(prompt, apiKey, provider, maxTokens = 1024) {
  return normalizeAiProvider(provider) === AI_PROVIDER.DEEPSEEK
    ? deepseek.deepseekChat(prompt, apiKey, maxTokens)
    : anthropic.claudeChat(prompt, apiKey, maxTokens);
}

export async function scanReceipt(b64, mt, apiKey, provider, correctionsHint = "") {
  return normalizeAiProvider(provider) === AI_PROVIDER.DEEPSEEK
    ? deepseek.scanReceipt(b64, mt, apiKey, correctionsHint)
    : anthropic.scanReceipt(b64, mt, apiKey, correctionsHint);
}

export async function parseTextReceipt(text, apiKey, provider, correctionsHint = "") {
  return normalizeAiProvider(provider) === AI_PROVIDER.DEEPSEEK
    ? deepseek.parseTextReceipt(text, apiKey, correctionsHint)
    : anthropic.parseTextReceipt(text, apiKey, correctionsHint);
}

export async function parseJsonReceipt(jsonContent, apiKey, provider, source = null, correctionsHint = "") {
  return normalizeAiProvider(provider) === AI_PROVIDER.DEEPSEEK
    ? deepseek.parseJsonReceipt(jsonContent, apiKey, source, correctionsHint)
    : anthropic.parseJsonReceipt(jsonContent, apiKey, source, correctionsHint);
}
