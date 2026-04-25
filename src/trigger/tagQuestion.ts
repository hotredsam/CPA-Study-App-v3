import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { runPipelineTag } from "@/lib/ai/pipeline-tag";
import { Transcript } from "@/lib/schemas/transcript";
import { makeThrottledStage } from "./progress";

export const tagQuestion = task({
  id: "tagQuestion",
  maxDuration: 120,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    logger.log("tagQuestion start", { questionId });

    // Read Question with transcript + extracted fields
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
    });
    const setStage = makeThrottledStage(question.recordingId);
    setStage({ stage: "tagging", pct: 0, message: "Tagging question" });

    await prisma.question.update({
      where: { id: questionId },
      data: { status: "tagging" },
    });

    // Build transcript text from JSON field
    let transcriptText: string | null = null;
    if (question.transcript !== null) {
      const parsed = Transcript.safeParse(question.transcript);
      if (parsed.success) {
        transcriptText = parsed.data.segments.map((s) => s.text).join(" ").trim() || null;
      }
    }

    // Build extracted text from JSON field
    let extractedText: string | null = null;
    if (question.extracted !== null) {
      extractedText = JSON.stringify(question.extracted);
    }

    try {
      await runPipelineTag({
        questionId,
        transcript: transcriptText,
        extractedText,
      });

      logger.log("tagQuestion complete", { questionId });
      setStage({ stage: "tagging", pct: 100, message: "Tagging complete" });
    } catch (err) {
      // Tagging failure is non-fatal — log and continue
      logger.warn("tagQuestion failed (non-fatal)", { questionId, err: String(err) });
      setStage({ stage: "tagging", pct: 100, message: "Tagging skipped" });
    }

    return { questionId, ok: true };
  },
});
