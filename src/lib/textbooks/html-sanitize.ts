const DISALLOWED_BLOCK_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "canvas",
  "picture",
  "video",
  "audio",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "meta",
  "link",
  "base",
  "template",
];

const DISALLOWED_VOID_TAGS = ["img", "source", "track"];

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeStyle(style: string): string {
  if (/url\s*\(|expression\s*\(|@import|behavior\s*:|javascript:/i.test(style)) {
    return "";
  }

  const safeDeclarations = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const [rawProperty, ...rawValue] = declaration.split(":");
      const property = rawProperty?.trim().toLowerCase() ?? "";
      const value = rawValue.join(":").trim();
      if (!property || !value) return false;
      if (!/^[a-z-]+$/.test(property)) return false;
      if (property === "position" && /fixed|sticky/i.test(value)) return false;
      if (property.includes("image")) return false;
      return !/[<>]/.test(value);
    });

  return safeDeclarations.join("; ");
}

export function sanitizeChunkHtml(input: string): string {
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[\s\S]*?>/gi, "");

  for (const tag of DISALLOWED_BLOCK_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  for (const tag of DISALLOWED_VOID_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  html = html
    .replace(/\s+on[a-z]+\s*=\s*("(?:[^"]*)"|'(?:[^']*)'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|xlink:href)\s*=\s*("(?:\s*(?:javascript:|data:|https?:|\/\/)[^"]*)"|'(?:\s*(?:javascript:|data:|https?:|\/\/)[^']*)'|(?:javascript:|data:|https?:|\/\/)[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*"([^"]*)"/gi, (_match: string, style: string) => {
      const safe = sanitizeStyle(style);
      return safe ? ` style="${escapeAttr(safe)}"` : "";
    })
    .replace(/\s+style\s*=\s*'([^']*)'/gi, (_match: string, style: string) => {
      const safe = sanitizeStyle(style);
      return safe ? ` style="${escapeAttr(safe)}"` : "";
    });

  return html.trim();
}

export function extractSanitizedHtmlFragment(input: string): string {
  const fenced = input.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let html = fenced?.[1] ?? input;
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (body?.[1]) {
    html = body[1];
  }
  return sanitizeChunkHtml(html);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
