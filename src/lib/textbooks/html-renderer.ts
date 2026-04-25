import { getOpenRouterApiKey } from "@/lib/llm/openrouter";
import { escapeHtml, extractSanitizedHtmlFragment } from "./html-sanitize";

type OpenRouterHtmlResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type RenderChunkHtmlInput = {
  pdfBuffer: Buffer;
  fileName: string;
  textbookTitle: string;
  chunkOrder: number;
  totalChunks: number;
  chapterRef: string | null;
  chunkTitle: string | null;
  chunkContent: string;
};

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MAX_PROMPT_TEXT_CHARS = 12_000;

function configuredHtmlModel(): string {
  return process.env.OPENROUTER_TEXTBOOK_HTML_MODEL?.trim() || "anthropic/claude-sonnet-4.6";
}

function configuredPdfEngine(): "cloudflare-ai" | "mistral-ocr" | "native" {
  const value = process.env.OPENROUTER_PDF_ENGINE?.trim();
  if (value === "cloudflare-ai" || value === "mistral-ocr" || value === "native") {
    return value;
  }
  return "mistral-ocr";
}

function configuredMaxTokens(): number {
  const parsed = Number.parseInt(process.env.OPENROUTER_TEXTBOOK_HTML_MAX_TOKENS ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 1000) return Math.min(parsed, 12_000);
  return 6000;
}

function clippedText(value: string): string {
  if (value.length <= MAX_PROMPT_TEXT_CHARS) return value;
  return `${value.slice(0, MAX_PROMPT_TEXT_CHARS)}\n\n[chunk text clipped for rendering prompt]`;
}

function buildPrompt(input: RenderChunkHtmlInput): string {
  const label = input.chapterRef ?? `Chunk ${input.chunkOrder + 1}`;
  const title = input.chunkTitle ?? label;

  return [
    "Convert the attached CPA textbook source into a safe semantic HTML fragment for the specific chunk below.",
    "",
    "Output rules:",
    "- Return only an HTML fragment; no markdown fence, no full document wrapper.",
    "- Do not use img, picture, canvas, iframe, object, external URLs, base64 data, or CSS background images.",
    "- Do not include publisher names, brand names, logos, copyright text, watermarks, repeated page headers, or page footers.",
    "- Do not mention Becker; render the educational content in a neutral, unbranded style.",
    "- Do not use inline style attributes. Use semantic HTML and compact tb- classes only.",
    "- Recreate tables as HTML tables.",
    "- Recreate charts, graphs, diagrams, timelines, flow arrows, callouts, and equation layouts as HTML/CSS or inline SVG.",
    "- Keep factual labels, numbers, captions, and relationships from the source; do not invent unreadable details.",
    "- If a visual cannot be read from the source, render a small <figure class=\"tb-figure tb-figure-missing\"><figcaption>...</figcaption></figure> placeholder instead of using a raster image.",
    "- Use compact classes prefixed with tb- and inline SVG attributes when needed. Do not include <style> or <script>.",
    "- Preserve headings, worked examples, lists, formulas, and page order for this chunk.",
    "",
    `Textbook: ${input.textbookTitle}`,
    `Chunk: ${input.chunkOrder + 1} of ${input.totalChunks}`,
    `Chunk label: ${label}`,
    `Chunk title: ${title}`,
    "",
    "OCR/text anchor for this chunk:",
    clippedText(input.chunkContent),
  ].join("\n");
}

export function fallbackChunkHtml(input: {
  chapterRef: string | null;
  chunkTitle: string | null;
  chunkContent: string;
}): string {
  const paragraphs = input.chunkContent
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 80);

  const heading = input.chunkTitle
    ? `<h2 class="tb-heading">${escapeHtml(input.chunkTitle)}</h2>`
    : "";
  const eyebrow = input.chapterRef
    ? `<p class="tb-eyebrow">${escapeHtml(input.chapterRef)}</p>`
    : "";
  const body = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("\n");

  return extractSanitizedHtmlFragment(`${eyebrow}\n${heading}\n${body}`);
}

export async function renderChunkHtml(input: RenderChunkHtmlInput): Promise<string> {
  const apiKey = await getOpenRouterApiKey();
  const prompt = buildPrompt(input);

  const payload = {
    model: configuredHtmlModel(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            file: {
              filename: input.fileName,
              file_data: `data:application/pdf;base64,${input.pdfBuffer.toString("base64")}`,
            },
          },
        ],
      },
    ],
    plugins: [
      {
        id: "file-parser",
        pdf: { engine: configuredPdfEngine() },
      },
    ],
    max_tokens: configuredMaxTokens(),
  };

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://cpa-study-app.local",
      "X-Title": "CPA Study App",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable body)");
    throw new Error(`OpenRouter textbook HTML render failed ${response.status}: ${text.slice(0, 500)}`);
  }

  const data = (await response.json()) as OpenRouterHtmlResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter textbook HTML render returned no content");
  }

  const html = extractSanitizedHtmlFragment(content);
  if (html.length < 40) {
    return fallbackChunkHtml(input);
  }

  return html;
}
