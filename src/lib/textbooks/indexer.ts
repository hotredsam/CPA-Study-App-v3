import { CpaSection, type Chunk, type IndexingConfig, type Textbook } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { downloadToTmp } from "@/lib/r2-download";
import { runAnkiGen } from "@/lib/ai/anki-gen";
import { runTopicExtract } from "@/lib/ai/topic-extract";
import { createTextbookChunkDrafts } from "./chunking";
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
}): Promise<{ chunks: Chunk[]; usedOcr: boolean; pageCount: number }> {
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
      onProgress: (progress) => {
        const pct = 10 + (progress.pageNumber / progress.pageCount) * 35;
        return emit(onProgress, {
          pct,
          message:
            progress.mode === "ocr"
              ? `OCR page ${progress.pageNumber} of ${progress.pageCount}`
              : `Read page ${progress.pageNumber} of ${progress.pageCount}`,
          sub: {
            current: progress.pageNumber,
            total: progress.pageCount,
            itemLabel: `Page ${progress.pageNumber}`,
          },
        });
      },
    });

    const drafts = createTextbookChunkDrafts({
      pages: extraction.pages,
      chunkSize: config.chunkSize,
      overlapWindow: config.overlapWindow,
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

    await prisma.textbook.update({
      where: { id: textbook.id },
      data: {
        pages: extraction.pageCount,
        chunkCount: chunks.length,
      },
    });

    return {
      chunks,
      usedOcr: extraction.usedOcr,
      pageCount: extraction.pageCount,
    };
  } finally {
    await rm(dirname(tmpPath), { recursive: true, force: true }).catch(() => undefined);
  }
}

async function loadOrCreateChunks(args: {
  textbook: Textbook;
  config: IndexingConfig;
  onProgress?: ProgressSink;
}): Promise<{ chunks: Chunk[]; usedOcr: boolean; chunksCreated: number }> {
  const existingChunks = await prisma.chunk.findMany({
    where: { textbookId: args.textbook.id },
    orderBy: { order: "asc" },
  });

  if (existingChunks.length > 0) {
    await emit(args.onProgress, {
      pct: 50,
      message: `Found ${existingChunks.length} existing chunks`,
    });
    return { chunks: existingChunks, usedOcr: false, chunksCreated: 0 };
  }

  const created = await createChunksFromPdf(args);
  await emit(args.onProgress, {
    pct: 50,
    message: `Created ${created.chunks.length} chunks from ${created.pageCount} pages`,
  });
  return {
    chunks: created.chunks,
    usedOcr: created.usedOcr,
    chunksCreated: created.chunks.length,
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
        pct: 50 + (current / chunks.length) * 45,
        message: `Analyzing chunk ${current} of ${chunks.length}`,
        sub: {
          current,
          total: chunks.length,
          itemLabel: chunk.chapterRef ?? `Chunk ${current}`,
        },
      });

      try {
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
          const before = await prisma.ankiCard.count({ where: { chunkId: chunk.id } });
          await runAnkiGen({
            chunkId: chunk.id,
            content: chunk.content,
            topicId: updatedChunk?.topicId ?? undefined,
            section,
          });
          const after = await prisma.ankiCard.count({ where: { chunkId: chunk.id } });
          ankiCardsCreated += Math.max(0, after - before);
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
