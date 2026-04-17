import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";

// STUB: Task 4 fills in the real ffmpeg scene detection + whisper pre-pass + pHash.
// Today we emit stubbed progress and fabricate a single question row so downstream
// stages have something to work with during pipeline smoke tests.

export const segmentRecording = task({
  id: "segmentRecording",
  maxDuration: 60 * 30,
  run: async (payload: { recordingId: string }) => {
    const { recordingId } = payload;
    const setStage = makeThrottledStage();

    for (let pct = 0; pct <= 100; pct += 10) {
      setStage({ stage: "segmenting", pct, message: `Segmenting (${pct}%)` });
      await new Promise((r) => setTimeout(r, 200));
    }

    const recording = await prisma.recording.findUniqueOrThrow({ where: { id: recordingId } });
    const stubClipKey = `clips/${recording.id}/clip.webm`;
    const created = await prisma.question.create({
      data: {
        recordingId: recording.id,
        clipR2Key: stubClipKey,
        thumbnailR2Key: null,
        startSec: 0,
        endSec: recording.durationSec ?? 60,
        section: null,
        status: "pending",
        noAudio: false,
        segmentationSignals: { stub: true, reason: "Task 4 not yet implemented" },
      },
    });

    logger.log("stub segmentation produced one question", { questionId: created.id });
    return { questionIds: [created.id] };
  },
});
