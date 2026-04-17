import { metadata } from "@trigger.dev/sdk/v3";
import type { StageProgress } from "@/lib/schemas/stageProgress";

type SetStage = (progress: StageProgress) => void;

export function makeThrottledStage(intervalMs = 1000): SetStage {
  let lastSent = 0;
  let pending: StageProgress | null = null;
  let timer: NodeJS.Timeout | null = null;

  const flush = () => {
    if (!pending) return;
    metadata.set("progress", pending);
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
