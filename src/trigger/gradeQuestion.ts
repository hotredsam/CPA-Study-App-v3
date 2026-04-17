import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";

// STUB: Task 7 fills in Claude grading call. For now we persist a placeholder
// Feedback row so the Review UI has something to render in dev.

export const gradeQuestion = task({
  id: "gradeQuestion",
  maxDuration: 60 * 15,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    const setStage = makeThrottledStage();

    await prisma.question.update({ where: { id: questionId }, data: { status: "grading" } });
    for (let pct = 0; pct <= 100; pct += 25) {
      setStage({ stage: "grading", pct, message: `Grading ${questionId} (${pct}%)` });
      await new Promise((r) => setTimeout(r, 150));
    }

    await prisma.feedback.upsert({
      where: { questionId },
      create: {
        questionId,
        items: { _stub: true, items: [] },
        accountingScore: 0,
        consultingScore: 0,
        combinedScore: 0,
        whatYouNeedToLearn: null,
        weakTopicTags: [],
      },
      update: {},
    });

    await prisma.question.update({ where: { id: questionId }, data: { status: "done" } });
    return { questionId, ok: true };
  },
});
