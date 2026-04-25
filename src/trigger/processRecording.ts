import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { StageProgress } from "@/lib/schemas/stageProgress";
import { setStageForRecording } from "./progress";
import { segmentRecording } from "@/trigger/segmentRecording";
import { extractQuestion } from "@/trigger/extractQuestion";
import { transcribeQuestion } from "@/trigger/transcribeQuestion";
import { tagQuestion } from "@/trigger/tagQuestion";
import { gradeQuestion } from "@/trigger/gradeQuestion";

export const processRecording = task({
  id: "processRecording",
  maxDuration: 60 * 60,
  run: async (payload: { recordingId: string }) => {
    const { recordingId } = payload;
    logger.log("orchestrator start", { recordingId });

    await setStage(recordingId, {
      stage: "segmenting",
      pct: 0,
      message: "Downloading recording",
    });

    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "segmenting" },
    });

    const segmentResult = await segmentRecording.triggerAndWait({ recordingId });
    if (!segmentResult.ok) {
      await fail(recordingId, "segmentation failed");
      throw new Error("segmentation failed");
    }
    const questionIds = segmentResult.output.questionIds;

    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "processing_questions" },
    });

    // Process questions sequentially — trigger.dev v3 does not support
    // Promise.all() around triggerAndWait calls.
    if (questionIds.length === 0) {
      await fail(recordingId, "segmentation produced no usable question clips");
      throw new Error("segmentation produced no usable question clips");
    }

    let gradedCount = 0;
    let failedCount = 0;

    for (const questionId of questionIds) {
      const transcribeRes = await transcribeQuestion.triggerAndWait({ questionId });
      if (!transcribeRes.ok) {
        failedCount++;
        continue;
      }

      const extractRes = await extractQuestion.triggerAndWait({ questionId });
      if (!extractRes.ok) {
        failedCount++;
        continue;
      }

      // Tag stage: non-blocking on failure (tagQuestion catches its own errors)
      await tagQuestion.triggerAndWait({ questionId });
      const gradeRes = await gradeQuestion.triggerAndWait({ questionId });
      if (!gradeRes.ok) {
        failedCount++;
        await prisma.question.update({
          where: { id: questionId },
          data: { status: "failed" },
        }).catch(() => undefined);
        continue;
      }
      gradedCount++;
    }

    if (gradedCount === 0) {
      await fail(recordingId, `all ${failedCount} question(s) failed during processing`);
      throw new Error("all questions failed during processing");
    }

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        status: "done",
        tagStage: {
          status: failedCount > 0 ? "completed_with_warnings" : "completed",
          completedAt: new Date().toISOString(),
          pct: 100,
          failedCount,
        },
      },
    });
    await setStage(recordingId, {
      stage: "grading",
      pct: 100,
      message: "All questions graded",
    });
    return { recordingId, questionIds };
  },
});

async function setStage(recordingId: string, progress: StageProgress): Promise<void> {
  await setStageForRecording(recordingId, progress);
}

async function fail(recordingId: string, message: string): Promise<void> {
  await prisma.recording.update({
    where: { id: recordingId },
    data: { status: "failed" },
  });
  logger.error(message, { recordingId });
}
