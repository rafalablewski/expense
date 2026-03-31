// AI provider abstraction — switches between Claude and DeepSeek

import { claudeChat, scanReceipt as claudeScan, parseTextReceipt as claudeParseText, parseJsonReceipt as claudeParseJson, compressImageIfNeeded, getCorrectionsHint } from "./claude";
import { deepseekChat, deepseekScanReceipt as deepseekScan, deepseekParseTextReceipt as deepseekParseText, deepseekParseJsonReceipt as deepseekParseJson } from "./deepseek";

export { compressImageIfNeeded, getCorrectionsHint } from "./claude";

export function aiChat(prompt, apiKey, provider = "claude", maxTokens = 1024) {
  return provider === "deepseek"
    ? deepseekChat(prompt, apiKey, maxTokens)
    : claudeChat(prompt, apiKey, maxTokens);
}

export function scanReceipt(b64, mt, apiKey, provider = "claude", correctionsHint = "") {
  return provider === "deepseek"
    ? deepseekScan(b64, mt, apiKey, correctionsHint)
    : claudeScan(b64, mt, apiKey, correctionsHint);
}

export function parseTextReceipt(text, apiKey, provider = "claude", correctionsHint = "") {
  return provider === "deepseek"
    ? deepseekParseText(text, apiKey, correctionsHint)
    : claudeParseText(text, apiKey, correctionsHint);
}

export function parseJsonReceipt(jsonContent, apiKey, provider = "claude", source = null, correctionsHint = "") {
  return provider === "deepseek"
    ? deepseekParseJson(jsonContent, apiKey, source, correctionsHint)
    : claudeParseJson(jsonContent, apiKey, source, correctionsHint);
}
