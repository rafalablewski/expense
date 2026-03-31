// Shared JSON extraction from assistant text (Anthropic / OpenAI-style APIs)

function stripCodeFences(raw) {
  return String(raw ?? "")
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\`\`\`\s*$/i, "")
    .trim();
}

/** First balanced `{...}` or `[...]` slice, respecting strings and escapes. */
function extractBalancedJson(s) {
  const start = s.search(/[\{\[]/);
  if (start < 0) return null;
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      if (!stack.length) return null;
      const o = stack.pop();
      if ((c === "}" && o !== "{") || (c === "]" && o !== "[")) return null;
      if (!stack.length) return s.slice(start, i + 1);
    }
  }
  return null;
}

export function parseJsonFromAssistantText(raw) {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractBalancedJson(cleaned);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        /* fall through */
      }
    }
    throw new Error("AI zwróciło nieprawidłowy format odpowiedzi. Spróbuj ponownie.");
  }
}
