import { metadata } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { StageProgress } from "@/lib/schemas/stageProgress";

type SetStage = (progress: StageProgress) => void;

function publishMetadata(progress: StageProgress): void {
  metadata.set("stageProgress", progress);
  metadata.set("progress", progress);
}

async function persistStage(recordingId: string, progress: StageProgress): Promise<void> {
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

export async function setStageForRecording(
  recordingId: string,
  progress: StageProgress,
): Promise<void> {
  publishMetadata(progress);
  await persistStage(recordingId, progress);
}

export function makeThrottledStage(recordingId?: string, intervalMs = 1000): SetStage {
  let lastSent = 0;
  let pending: StageProgress | null = null;
  let timer: NodeJS.Timeout | null = null;

  const flush = () => {
    if (!pending) return;
    publishMetadata(pending);
    if (recordingId) {
      void persistStage(recordingId, pending).catch(() => undefined);
    }
    pending = null;
    lastSent = Date.now();
  };

  return (progress: StageProgress) => {
    pending = progress;
    const sinceLast = Date.now() - lastSent;
    if (sinceLast >= intervalMs) {
      flush();
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, intervalMs - sinceLast);
    }
  };
}
