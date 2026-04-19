import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { StageProgress } from "@/lib/schemas/stageProgress";
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
    for (const questionId of questionIds) {
      const extractRes = await extractQuestion.triggerAndWait({ questionId });
      const transcribeRes = await transcribeQuestion.triggerAndWait({ questionId });
      if (!extractRes.ok || !transcribeRes.ok) continue;
      // Tag stage: non-blocking on failure (tagQuestion catches its own errors)
      await tagQuestion.triggerAndWait({ questionId });
      await gradeQuestion.triggerAndWait({ questionId });
    }

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        status: "done",
        tagStage: { status: "completed", completedAt: new Date().toISOString(), pct: 100 },
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
  metadata.set("progress", progress);
  await prisma.stageProgress.create({
    data: {
      recordingId,
      stage: progress.stage,
      pct: progress.pct,
      etaSec: progress.etaSec ?? null,
      message: progress.message,
    },
  });
}

async function fail(recordingId: string, message: string): Promise<void> {
  await prisma.recording.update({
    where: { id: recordingId },
    data: { status: "failed" },
  });
  logger.error(message, { recordingId });
}
