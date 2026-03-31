// AI provider facade: Anthropic (Claude) or DeepSeek

import * as anthropic from "./claude";
import * as deepseek from "./deepseek";

export const AI_PROVIDER = {
  ANTHROPIC: "anthropic",
  DEEPSEEK: "deepseek",
};

export { getCorrectionsHint, compressImageIfNeeded } from "./claude";

export async function aiChat(prompt, apiKey, provider, maxTokens = 1024) {
  return provider === AI_PROVIDER.DEEPSEEK
    ? deepseek.deepseekChat(prompt, apiKey, maxTokens)
    : anthropic.claudeChat(prompt, apiKey, maxTokens);
}

export async function scanReceipt(b64, mt, apiKey, provider, correctionsHint = "") {
  return provider === AI_PROVIDER.DEEPSEEK
    ? deepseek.scanReceipt(b64, mt, apiKey, correctionsHint)
    : anthropic.scanReceipt(b64, mt, apiKey, correctionsHint);
}

export async function parseTextReceipt(text, apiKey, provider, correctionsHint = "") {
  return provider === AI_PROVIDER.DEEPSEEK
    ? deepseek.parseTextReceipt(text, apiKey, correctionsHint)
    : anthropic.parseTextReceipt(text, apiKey, correctionsHint);
}

export async function parseJsonReceipt(jsonContent, apiKey, provider, source = null, correctionsHint = "") {
  return provider === AI_PROVIDER.DEEPSEEK
    ? deepseek.parseJsonReceipt(jsonContent, apiKey, source, correctionsHint)
    : anthropic.parseJsonReceipt(jsonContent, apiKey, source, correctionsHint);
}
