import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { indexTextbook } from "@/lib/textbooks/indexer";
import type { StageProgress } from "@/lib/schemas/stageProgress";

export const textbookIndexer = task({
  id: "textbook-indexer",
  maxDuration: 3600,
  run: async (payload: { textbookId: string; rebuildChunks?: boolean }) => {
    const { textbookId, rebuildChunks = false } = payload;
    logger.log("textbookIndexer start", { textbookId, rebuildChunks });

    let lastEmit = 0;
    const result = await indexTextbook({
      textbookId,
      rebuildChunks,
      onProgress: (progress) => {
        const now = Date.now();
        if (now - lastEmit < 1000 && progress.pct < 100) return;
        lastEmit = now;
        const stageProgress: StageProgress = {
          stage: "tagging",
          pct: progress.pct,
          message: progress.message,
          sub: progress.sub,
        };
        metadata.set("stageProgress", stageProgress);
        metadata.set("progress", stageProgress);
      },
    });

    logger.log("textbookIndexer complete", result);
    return result;
  },
});
