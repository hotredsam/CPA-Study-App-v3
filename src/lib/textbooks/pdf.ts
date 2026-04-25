import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker, setLogging, type Worker } from "tesseract.js";
import type { PageText } from "./chunking";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type PdfExtractionResult = {
  pages: PageText[];
  pageCount: number;
  usedOcr: boolean;
};

export type PdfExtractionProgress = {
  pageNumber: number;
  pageCount: number;
  mode: "text" | "ocr";
};

type CanvasAndContext = {
  canvas: Canvas;
  context: SKRSContext2D;
};

class NodeCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    canvasAndContext.canvas.width = Math.ceil(width);
    canvasAndContext.canvas.height = Math.ceil(height);
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

function normalizePageText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function renderPageToPng(
  page: pdfjsLib.PDFPageProxy,
  scale: number,
): Promise<Buffer> {
  const viewport = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const canvasAndContext = factory.create(viewport.width, viewport.height);

  try {
    await page
      .render({
        canvasContext:
          canvasAndContext.context as unknown as CanvasRenderingContext2D,
        viewport,
      })
      .promise;
    return canvasAndContext.canvas.toBuffer("image/png");
  } finally {
    factory.destroy(canvasAndContext);
  }
}

async function recognizePage(worker: Worker, png: Buffer): Promise<string> {
  const result = await worker.recognize(png);
  return normalizePageText(result.data.text);
}

async function createOcrWorker(): Promise<Worker> {
  const cachePath = join(tmpdir(), "cpa-study-tesseract");
  await mkdir(cachePath, { recursive: true });
  return createWorker("eng", undefined, { cachePath });
}

export async function extractPdfText(args: {
  buffer: Buffer;
  ocrMode: boolean;
  renderScale?: number;
  onProgress?: (progress: PdfExtractionProgress) => void | Promise<void>;
}): Promise<PdfExtractionResult> {
  setLogging(false);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(args.buffer),
  });
  const document = await loadingTask.promise;
  let worker: Worker | null = null;
  let usedOcr = false;

  try {
    const pages: PageText[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const embeddedText = normalizePageText(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );

      if (embeddedText.length >= 40 || !args.ocrMode) {
        await args.onProgress?.({
          pageNumber,
          pageCount: document.numPages,
          mode: "text",
        });
        pages.push({ pageNumber, text: embeddedText });
        continue;
      }

      worker ??= await createOcrWorker();
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "220",
      });
      usedOcr = true;
      const png = await renderPageToPng(page, args.renderScale ?? 2);
      const ocrText = await recognizePage(worker, png);
      await args.onProgress?.({
        pageNumber,
        pageCount: document.numPages,
        mode: "ocr",
      });
      pages.push({ pageNumber, text: ocrText });
    }

    return {
      pages: pages.filter((page) => page.text.trim().length > 0),
      pageCount: document.numPages,
      usedOcr,
    };
  } finally {
    await worker?.terminate().catch(() => undefined);
    await document.destroy();
  }
}
