import { prisma } from "@/lib/prisma";
import { indexTextbook } from "./indexer";

export type TextbookIndexQueueResult = {
  mode: "local" | "trigger" | "skipped";
};

function shouldRunLocally(): boolean {
  const mode = process.env.TEXTBOOK_INDEXER_MODE?.trim().toLowerCase();
  if (mode === "trigger") return false;
  if (mode === "local") return true;
  return process.env.NODE_ENV !== "production";
}

function startLocalIndex(textbookId: string, rebuildChunks: boolean): void {
  setTimeout(() => {
    void indexTextbook({ textbookId, rebuildChunks }).catch(async (err: unknown) => {
      console.error("[textbook-indexer/local] failed", err);
      await prisma.textbook
        .update({
          where: { id: textbookId },
          data: { indexStatus: "FAILED" },
        })
        .catch(() => undefined);
    });
  }, 0);
}

export async function queueTextbookIndex(args: {
  textbookId: string;
  rebuildChunks?: boolean;
}): Promise<TextbookIndexQueueResult> {
  const rebuildChunks = args.rebuildChunks ?? false;

  if (shouldRunLocally()) {
    startLocalIndex(args.textbookId, rebuildChunks);
    return { mode: "local" };
  }

  if (process.env.TRIGGER_SECRET_KEY) {
    const { tasks } = await import("@trigger.dev/sdk/v3");
    await tasks.trigger("textbook-indexer", {
      textbookId: args.textbookId,
      rebuildChunks,
    });
    return { mode: "trigger" };
  }

  return { mode: "skipped" };
}
