import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";

// STUB: Task 6 fills in smart-whisper transcription with stderr progress parsing.

export const transcribeQuestion = task({
  id: "transcribeQuestion",
  maxDuration: 60 * 30,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    const setStage = makeThrottledStage();

    await prisma.question.update({ where: { id: questionId }, data: { status: "transcribing" } });
    for (let pct = 0; pct <= 100; pct += 20) {
      setStage({ stage: "transcribing", pct, message: `Transcribing ${questionId} (${pct}%)` });
      await new Promise((r) => setTimeout(r, 150));
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        transcript: {
          _stub: true,
          segments: [],
        },
      },
    });
    return { questionId, ok: true };
  },
});
