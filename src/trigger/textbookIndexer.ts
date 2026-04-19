import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { runTopicExtract } from "@/lib/ai/topic-extract";
import { runAnkiGen } from "@/lib/ai/anki-gen";

export const textbookIndexer = task({
  id: "textbook-indexer",
  maxDuration: 3600,
  run: async (payload: { textbookId: string }) => {
    const { textbookId } = payload;
    logger.log("textbookIndexer start", { textbookId });

    // 1. Load Textbook from DB
    const textbook = await prisma.textbook.findUniqueOrThrow({
      where: { id: textbookId },
    });

    // 2. Update status to INDEXING
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { indexStatus: "INDEXING" },
    });

    // 3. Load all Chunks for this textbook (ordered by order)
    const chunks = await prisma.chunk.findMany({
      where: { textbookId },
      orderBy: { order: "asc" },
    });

    logger.log("textbookIndexer chunks loaded", {
      textbookId,
      chunkCount: chunks.length,
      title: textbook.title,
    });

    let chunksProcessed = 0;

    // 4. Process each Chunk sequentially — NOT Promise.all (trigger.dev v3 constraint)
    for (const chunk of chunks) {
      try {
        // a. Call runTopicExtract
        const topicResult = await runTopicExtract({
          chunkId: chunk.id,
          content: chunk.content,
          chapterRef: chunk.chapterRef ?? undefined,
        });

        // b. If it returned a batchJobId (batch mode), skip for now and continue
        if (topicResult.batchJobId) {
          logger.log("textbookIndexer: chunk queued for batch", {
            chunkId: chunk.id,
            batchJobId: topicResult.batchJobId,
          });
          chunksProcessed++;
          continue;
        }

        // c. Reload chunk to get updated topicId (set by runTopicExtract)
        const updatedChunk = await prisma.chunk.findUnique({
          where: { id: chunk.id },
        });

        // d. Call runAnkiGen for this chunk
        await runAnkiGen({
          chunkId: chunk.id,
          content: chunk.content,
          topicId: updatedChunk?.topicId ?? undefined,
        });

        chunksProcessed++;
      } catch (err) {
        logger.warn("textbookIndexer: chunk failed (continuing)", {
          chunkId: chunk.id,
          err: String(err),
        });
        chunksProcessed++;
      }
    }

    // 5. Update Textbook status to READY
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        indexStatus: "READY",
        indexedAt: new Date(),
        chunkCount: chunks.length,
      },
    });

    logger.log("textbookIndexer complete", { textbookId, chunksProcessed });

    return { textbookId, chunksProcessed };
  },
});
