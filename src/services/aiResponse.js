// Shared JSON extraction from assistant text (Anthropic / OpenAI-style APIs)

export function parseJsonFromAssistantText(raw) {
  const cleaned = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI zwróciło nieprawidłowy format odpowiedzi. Spróbuj ponownie.");
  }
}
