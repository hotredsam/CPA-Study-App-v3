import { CpaSection, type Chunk, type IndexingConfig, type Textbook } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { downloadToTmp } from "@/lib/r2-download";
import { runAnkiGen } from "@/lib/ai/anki-gen";
import { runTopicExtract } from "@/lib/ai/topic-extract";
import { createTextbookChunkDrafts } from "./chunking";
import { fallbackChunkHtml, renderChunkHtml } from "./html-renderer";
import { extractPdfText } from "./pdf";
import { readFile, rm } from "node:fs/promises";
import { dirname, extname } from "node:path";

export type TextbookIndexProgress = {
  pct: number;
  message: string;
  sub?: {
    current: number;
    total: number;
    itemLabel?: string;
  };
};

export type TextbookIndexResult = {
  textbookId: string;
  chunksCreated: number;
  htmlChunksRendered: number;
  chunksAnalyzed: number;
  ankiCardsCreated: number;
  aiFailures: number;
  usedOcr: boolean;
};

type ProgressSink = (progress: TextbookIndexProgress) => void | Promise<void>;

const FALLBACK_SECTION = CpaSection.FAR;

function clampPct(pct: number): number {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

async function emit(onProgress: ProgressSink | undefined, progress: TextbookIndexProgress): Promise<void> {
  await onProgress?.({ ...progress, pct: clampPct(progress.pct) });
}

function primarySection(textbook: Pick<Textbook, "sections">): CpaSection {
  return textbook.sections[0] ?? FALLBACK_SECTION;
}

function sourceFileName(textbook: Pick<Textbook, "r2Key">): string {
  return textbook.r2Key?.split("/").pop() ?? "textbook.pdf";
}

async function getIndexingConfig(): Promise<IndexingConfig> {
  return prisma.indexingConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

async function removePriorIndexedContent(textbookId: string): Promise<void> {
  const oldChunks = await prisma.chunk.findMany({
    where: { textbookId },
    select: { id: true },
  });
  const oldChunkIds = oldChunks.map((chunk) => chunk.id);

  if (oldChunkIds.length > 0) {
    await prisma.ankiCard.deleteMany({
      where: { chunkId: { in: oldChunkIds } },
    });
  }

  await prisma.chunk.deleteMany({ where: { textbookId } });
}

async function createChunksFromPdf(args: {
  textbook: Textbook;
  config: IndexingConfig;
  onProgress?: ProgressSink;
}): Promise<{ chunks: Chunk[]; usedOcr: boolean; pageCount: number; htmlChunksRendered: number }> {
  const { textbook, config, onProgress } = args;
  if (!textbook.r2Key) {
    throw new Error(`Textbook ${textbook.id} has no uploaded source file`);
  }

  const extension = extname(textbook.r2Key).replace(".", "").toLowerCase() || "pdf";
  if (extension !== "pdf") {
    throw new Error(`Textbook indexing currently supports PDF files; got .${extension}`);
  }

  await emit(onProgress, { pct: 5, message: "Downloading textbook PDF" });
  const tmpPath = await downloadToTmp(textbook.r2Key, extension);

  try {
    const buffer = await readFile(tmpPath);
    await emit(onProgress, { pct: 10, message: "Extracting textbook text" });

    const extraction = await extractPdfText({
      buffer,
      ocrMode: config.ocrMode,
      fileName: textbook.r2Key.split("/").pop() ?? "textbook.pdf",
      onProgress: (progress) => {
        return emit(onProgress, {
          pct: progress.pageNumber > 0 ? 45 : 12,
          message:
            progress.pageNumber > 0
              ? `Parsed ${progress.pageCount} PDF sections with OpenRouter`
              : "Parsing PDF with OpenRouter",
          sub: {
            current: progress.pageNumber,
            total: progress.pageCount,
            itemLabel: "OpenRouter PDF parser",
          },
        });
      },
    });

    const drafts = createTextbookChunkDrafts({
      pages: extraction.pages,
      chunkSize: config.chunkSize,
      overlapWindow: config.overlapWindow,
      textbookTitle: textbook.title,
      section: primarySection(textbook),
    });

    if (drafts.length === 0) {
      throw new Error(
        config.ocrMode
          ? "No readable text was found in the PDF after OCR"
          : "No embedded PDF text was found; enable OCR mode in indexing settings",
      );
    }

    await emit(onProgress, { pct: 48, message: `Creating ${drafts.length} textbook chunks` });

    await removePriorIndexedContent(textbook.id);
    const chunks: Chunk[] = [];
    for (const draft of drafts) {
      const chunk = await prisma.chunk.create({
        data: {
          textbookId: textbook.id,
          order: draft.order,
          chapterRef: draft.chapterRef,
          title: draft.title,
          content: draft.content,
        },
      });
      chunks.push(chunk);
    }

    const rendered = await ensureHtmlForChunks({
      textbook,
      chunks,
      pdfBuffer: buffer,
      fileName: sourceFileName(textbook),
      onProgress,
      startPct: 50,
      endPct: 66,
    });

    await prisma.textbook.update({
      where: { id: textbook.id },
      data: {
        pages: extraction.pageCount,
        chunkCount: rendered.chunks.length,
      },
    });

    return {
      chunks: rendered.chunks,
      usedOcr: extraction.usedOcr,
      pageCount: extraction.pageCount,
      htmlChunksRendered: rendered.renderedCount,
    };
  } finally {
    await rm(dirname(tmpPath), { recursive: true, force: true }).catch(() => undefined);
  }
}

async function loadSourcePdfBuffer(textbook: Textbook): Promise<{
  buffer: Buffer;
  fileName: string;
  cleanup: () => Promise<void>;
}> {
  if (!textbook.r2Key) {
    throw new Error(`Textbook ${textbook.id} has no uploaded source file`);
  }

  const extension = extname(textbook.r2Key).replace(".", "").toLowerCase() || "pdf";
  if (extension !== "pdf") {
    throw new Error(`Textbook HTML rendering currently supports PDF files; got .${extension}`);
  }

  const tmpPath = await downloadToTmp(textbook.r2Key, extension);
  const buffer = await readFile(tmpPath);
  return {
    buffer,
    fileName: sourceFileName(textbook),
    cleanup: async () => {
      await rm(dirname(tmpPath), { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function ensureHtmlForChunks(args: {
  textbook: Textbook;
  chunks: Chunk[];
  pdfBuffer: Buffer;
  fileName: string;
  onProgress?: ProgressSink;
  startPct: number;
  endPct: number;
}): Promise<{ chunks: Chunk[]; renderedCount: number; htmlFailures: number }> {
  const missing = args.chunks.filter((chunk) => !chunk.htmlContent?.trim());
  if (missing.length === 0) {
    return { chunks: args.chunks, renderedCount: 0, htmlFailures: 0 };
  }

  const byId = new Map(args.chunks.map((chunk) => [chunk.id, chunk]));
  let renderedCount = 0;
  let htmlFailures = 0;
  const total = missing.length;

  for (const [index, chunk] of missing.entries()) {
    const current = index + 1;
    await emit(args.onProgress, {
      pct: args.startPct + (current / total) * (args.endPct - args.startPct),
      message: `Rendering textbook HTML ${current} of ${total}`,
      sub: {
        current,
        total,
        itemLabel: chunk.chapterRef ?? `Chunk ${chunk.order + 1}`,
      },
    });

    let htmlContent: string;
    try {
      htmlContent = await renderChunkHtml({
        pdfBuffer: args.pdfBuffer,
        fileName: args.fileName,
        textbookTitle: args.textbook.title,
        chunkOrder: chunk.order,
        totalChunks: args.chunks.length,
        chapterRef: chunk.chapterRef,
        chunkTitle: chunk.title,
        chunkContent: chunk.content,
      });
    } catch (err) {
      htmlFailures++;
      console.warn("[textbook-indexer] HTML render failed; using text fallback", {
        textbookId: args.textbook.id,
        chunkId: chunk.id,
        error: String(err),
      });
      htmlContent = fallbackChunkHtml({
        chapterRef: chunk.chapterRef,
        chunkTitle: chunk.title,
        chunkContent: chunk.content,
      });
    }

    const updated = await prisma.chunk.update({
      where: { id: chunk.id },
      data: { htmlContent },
    });
    byId.set(updated.id, updated);
    renderedCount++;
  }

  return {
    chunks: args.chunks.map((chunk) => byId.get(chunk.id) ?? chunk),
    renderedCount,
    htmlFailures,
  };
}

async function loadOrCreateChunks(args: {
  textbook: Textbook;
  config: IndexingConfig;
  onProgress?: ProgressSink;
}): Promise<{ chunks: Chunk[]; usedOcr: boolean; chunksCreated: number; htmlChunksRendered: number }> {
  const existingChunks = await prisma.chunk.findMany({
    where: { textbookId: args.textbook.id },
    orderBy: { order: "asc" },
  });

  if (existingChunks.length > 0) {
    await emit(args.onProgress, {
      pct: 50,
      message: `Found ${existingChunks.length} existing chunks`,
    });
    const missingHtml = existingChunks.some((chunk) => !chunk.htmlContent?.trim());
    if (!missingHtml) {
      return { chunks: existingChunks, usedOcr: false, chunksCreated: 0, htmlChunksRendered: 0 };
    }

    await emit(args.onProgress, { pct: 52, message: "Downloading textbook source for HTML rendering" });
    const source = await loadSourcePdfBuffer(args.textbook);
    try {
      const rendered = await ensureHtmlForChunks({
        textbook: args.textbook,
        chunks: existingChunks,
        pdfBuffer: source.buffer,
        fileName: source.fileName,
        onProgress: args.onProgress,
        startPct: 54,
        endPct: 66,
      });
      return { chunks: rendered.chunks, usedOcr: false, chunksCreated: 0, htmlChunksRendered: rendered.renderedCount };
    } finally {
      await source.cleanup();
    }
  }

  const created = await createChunksFromPdf(args);
  await emit(args.onProgress, {
    pct: 66,
    message: `Created ${created.chunks.length} chunks from ${created.pageCount} pages`,
  });
  return {
    chunks: created.chunks,
    usedOcr: created.usedOcr,
    chunksCreated: created.chunks.length,
    htmlChunksRendered: created.htmlChunksRendered,
  };
}

export async function indexTextbook(args: {
  textbookId: string;
  rebuildChunks?: boolean;
  onProgress?: ProgressSink;
}): Promise<TextbookIndexResult> {
  const { textbookId, rebuildChunks = false, onProgress } = args;
  const textbook = await prisma.textbook.findUniqueOrThrow({
    where: { id: textbookId },
  });
  const config = await getIndexingConfig();
  const section = primarySection(textbook);

  await prisma.textbook.update({
    where: { id: textbookId },
    data: { indexStatus: "INDEXING", indexedAt: null },
  });

  try {
    if (rebuildChunks) {
      await emit(onProgress, { pct: 3, message: "Clearing old textbook chunks" });
      await removePriorIndexedContent(textbookId);
    }

    const { chunks, usedOcr, chunksCreated } = await loadOrCreateChunks({ textbook, config, onProgress });
    let chunksAnalyzed = 0;
    let aiFailures = 0;
    let ankiCardsCreated = 0;

    for (const [index, chunk] of chunks.entries()) {
      const current = index + 1;
      await emit(onProgress, {
        pct: 66 + (current / chunks.length) * 29,
        message: `Analyzing chunk ${current} of ${chunks.length}`,
        sub: {
          current,
          total: chunks.length,
          itemLabel: chunk.chapterRef ?? `Chunk ${current}`,
        },
      });

      try {
        const existingCardCount = await prisma.ankiCard.count({ where: { chunkId: chunk.id } });
        if (chunk.topicId && (!config.ankiCardGen || existingCardCount > 0)) {
          chunksAnalyzed++;
          continue;
        }

        const topicResult = await runTopicExtract({
          chunkId: chunk.id,
          content: chunk.content,
          chapterRef: chunk.chapterRef ?? undefined,
          section,
        });

        if (topicResult.batchJobId) {
          chunksAnalyzed++;
          continue;
        }

        const updatedChunk = await prisma.chunk.findUnique({
          where: { id: chunk.id },
          select: { topicId: true },
        });

        if (config.ankiCardGen) {
          const before = existingCardCount;
          if (before === 0) {
            await runAnkiGen({
              chunkId: chunk.id,
              content: chunk.content,
              topicId: updatedChunk?.topicId ?? undefined,
              section,
            });
            const after = await prisma.ankiCard.count({ where: { chunkId: chunk.id } });
            ankiCardsCreated += Math.max(0, after - before);
          }
        }

        chunksAnalyzed++;
      } catch (err) {
        aiFailures++;
        console.warn("[textbook-indexer] chunk analysis failed", {
          textbookId,
          chunkId: chunk.id,
          error: String(err),
        });
      }
    }

    if (chunksAnalyzed === 0) {
      throw new Error("AI analysis failed for every textbook chunk");
    }

    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        indexStatus: "READY",
        indexedAt: new Date(),
        chunkCount: chunks.length,
      },
    });
    await emit(onProgress, { pct: 100, message: "Textbook indexed" });

    return {
      textbookId,
      chunksCreated,
      htmlChunksRendered: chunks.filter((chunk) => chunk.htmlContent?.trim()).length,
      chunksAnalyzed,
      ankiCardsCreated,
      aiFailures,
      usedOcr,
    };
  } catch (err) {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { indexStatus: "FAILED" },
    });
    throw err;
  }
}
