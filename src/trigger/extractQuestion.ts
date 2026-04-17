import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";

// STUB: Task 5 fills in Claude vision keyframe extraction.

export const extractQuestion = task({
  id: "extractQuestion",
  maxDuration: 60 * 15,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    const setStage = makeThrottledStage();

    await prisma.question.update({ where: { id: questionId }, data: { status: "extracting" } });
    for (let pct = 0; pct <= 100; pct += 25) {
      setStage({ stage: "extracting", pct, message: `Extracting question ${questionId} (${pct}%)` });
      await new Promise((r) => setTimeout(r, 150));
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        extracted: {
          _stub: true,
          question: "(stub) question text",
          choices: [],
          userAnswer: null,
          correctAnswer: null,
          beckerExplanation: null,
          section: null,
        },
      },
    });
    return { questionId: question.id, ok: true };
  },
});
