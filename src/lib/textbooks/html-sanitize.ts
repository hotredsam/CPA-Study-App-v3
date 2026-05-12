import sanitizeHtml from "sanitize-html";

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
  const withoutDocNoise = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[\s\S]*?>/gi, "");

  const html = sanitizeHtml(withoutDocNoise, {
    allowedTags: [
      "article",
      "section",
      "div",
      "p",
      "br",
      "hr",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "sub",
      "sup",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "dl",
      "dt",
      "dd",
      "span",
    ],
    allowedAttributes: {
      table: ["aria-label"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: [],
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    parser: { lowerCaseAttributeNames: true },
  });

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
