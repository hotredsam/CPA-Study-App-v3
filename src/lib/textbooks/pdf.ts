import { getOpenRouterApiKey } from "@/lib/llm/openrouter";
import type { PageText } from "./chunking";

export type PdfExtractionResult = {
  pages: PageText[];
  pageCount: number;
  usedOcr: boolean;
};

export type PdfExtractionProgress = {
  pageNumber: number;
  pageCount: number;
  mode: "openrouter";
};

type PdfEngine = "cloudflare-ai" | "mistral-ocr" | "native";

type OpenRouterPdfContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OpenRouterPdfAnnotation = {
  type: "file";
  file?: {
    content?: OpenRouterPdfContentPart[];
    hash?: string;
    name?: string;
  };
};

type OpenRouterPdfResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      annotations?: OpenRouterPdfAnnotation[];
    };
  }>;
};

function configuredPdfEngine(ocrMode: boolean): PdfEngine {
  const value = process.env.OPENROUTER_PDF_ENGINE?.trim();
  if (value === "cloudflare-ai" || value === "mistral-ocr" || value === "native") {
    return value;
  }
  return ocrMode ? "mistral-ocr" : "cloudflare-ai";
}

function configuredPdfModel(): string {
  return process.env.OPENROUTER_PDF_MODEL?.trim() || "anthropic/claude-haiku-4.5";
}

function normalizeText(text: string): string {
  return text
    .replace(/^<file[^>]*>\s*/i, "")
    .replace(/\s*<\/file>\s*$/i, "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function annotationsToPages(annotations: OpenRouterPdfAnnotation[]): PageText[] {
  const textParts = annotations
    .flatMap((annotation) => annotation.file?.content ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => normalizeText(part.text))
    .filter(Boolean);

  return textParts.map((text, index) => ({
    pageNumber: index + 1,
    text,
  }));
}

export async function extractPdfText(args: {
  buffer: Buffer;
  ocrMode: boolean;
  fileName?: string;
  onProgress?: (progress: PdfExtractionProgress) => void | Promise<void>;
}): Promise<PdfExtractionResult> {
  const engine = configuredPdfEngine(args.ocrMode);
  await args.onProgress?.({ pageNumber: 0, pageCount: 1, mode: "openrouter" });

  const apiKey = await getOpenRouterApiKey();
  const payload = {
    model: configuredPdfModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Parse this CPA textbook PDF. Reply with only OK; the app will read the parsed file annotations.",
          },
          {
            type: "file",
            file: {
              filename: args.fileName ?? "textbook.pdf",
              file_data: `data:application/pdf;base64,${args.buffer.toString("base64")}`,
            },
          },
        ],
      },
    ],
    plugins: [
      {
        id: "file-parser",
        pdf: { engine },
      },
    ],
    max_tokens: 16,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
    throw new Error(`OpenRouter PDF parser failed ${response.status}: ${text.slice(0, 500)}`);
  }

  const data = (await response.json()) as OpenRouterPdfResponse;
  const annotations = data.choices?.[0]?.message?.annotations ?? [];
  const pages = annotationsToPages(annotations);

  if (pages.length === 0) {
    const fallback = normalizeText(data.choices?.[0]?.message?.content ?? "");
    if (fallback.length > 0 && fallback !== "OK.") {
      pages.push({ pageNumber: 1, text: fallback });
    }
  }

  await args.onProgress?.({
    pageNumber: pages.length,
    pageCount: Math.max(1, pages.length),
    mode: "openrouter",
  });

  return {
    pages,
    pageCount: pages.length,
    usedOcr: engine === "mistral-ocr",
  };
}
