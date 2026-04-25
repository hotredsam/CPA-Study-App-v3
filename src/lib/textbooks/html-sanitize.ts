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

const BRANDING_PATTERNS = [
  /(?:\u00a9|\(c\)|copyright)\s*[^<\n]*(?:becker|professional education|all rights reserved)[^<\n]*/gi,
  /\bBecker\s+Professional\s+Education(?:\s+Corporation)?\.?/gi,
  /\bBecker\b/gi,
  /\bAll rights reserved\.?/gi,
];

function removePublisherBranding(input: string): string {
  let html = input;
  for (const pattern of BRANDING_PATTERNS) {
    html = html.replace(pattern, "");
  }

  return html
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<p\b[^>]*>\s*<\/p>/gi, "")
    .replace(/<span\b[^>]*>\s*<\/span>/gi, "")
    .replace(/<div\b[^>]*>\s*<\/div>/gi, "");
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
    .replace(/\s+style\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+style\s*=\s*'[^']*'/gi, "")
    .replace(/\s+(fill|stroke)\s*=\s*"(?:#[0-9a-f]{3,8}|rgb\([^"]+\)|hsl\([^"]+\))"/gi, "")
    .replace(/\s+(fill|stroke)\s*=\s*'(?:#[0-9a-f]{3,8}|rgb\([^']+\)|hsl\([^']+\))'/gi, "");

  return removePublisherBranding(html).trim();
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
