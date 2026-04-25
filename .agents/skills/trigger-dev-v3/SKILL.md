---
name: trigger-dev-v3
description: Conventions for Trigger.dev v3 tasks in this repo — StageProgress metadata, throttling, build extensions, retry policies, realtime subscriptions. Use when writing anything under src/trigger or wiring progress into the UI.
---

# Trigger.dev v3 Conventions

## `StageProgress` metadata shape (locked)

Every long task sets metadata on this shape:

```ts
export type StageProgress = {
  stage: "segmenting" | "extracting" | "transcribing" | "grading" | "uploading";
  pct: number;       // 0–100
  etaSec?: number;   // remaining time; optional
  message: string;   // short human-readable status
  sub?: {            // optional per-item sub-progress (e.g., "transcribing 3/7")
    current: number;
    total: number;
    itemLabel?: string;
  };
};
```

Expose it via `metadata.set("stageProgress", value)` from inside the task.

## Throttling rule (hard limit: 1 Hz)

```ts
let lastEmit = 0;
function emit(update: StageProgress) {
  const now = Date.now();
  if (now - lastEmit < 1000 && update.pct < 100) return; // skip unless final
  lastEmit = now;
  metadata.set("stageProgress", update);
}
```

Trigger.dev rate-limits metadata; too-frequent writes drop silently and can mask real progress.

## Machine size

- Default: `large-2x` — enough CPU for `whisper.cpp` small.en at ~5–10× realtime.
- Upgrade: `large-4x` only if per-clip transcription regularly exceeds 60s for a 5-min clip.
- Do not use `small-1x` — ffmpeg + whisper will OOM.

## Retry policy

```ts
export const segmentRecording = task({
  id: "segment-recording",
  machine: { preset: "large-2x" },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload, { metadata, ctx }) => {
    // ...
  },
});
```

- 3 attempts, exponential backoff, jittered.
- On **structural errors** (Zod parse failure on Codex output, invalid payload, missing R2 object) — do NOT retry. Throw `new NonRetriableError(...)` so the task fails fast.

## Build extensions (required)

`trigger.config.ts` MUST declare:

```ts
import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/ffmpeg";
import { additionalFiles } from "@trigger.dev/build/extensions/core";
import { whisperCppBuildExtension } from "./trigger/extensions/whisper-cpp";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  runtime: "node",
  logLevel: "info",
  build: {
    extensions: [
      ffmpeg(),
      whisperCppBuildExtension({ models: ["small.en", "tiny.en"] }),
      additionalFiles({ files: ["./fixtures/becker-templates/*.png"] }),
    ],
  },
  dirs: ["./src/trigger"],
});
```

The custom `whisperCppBuildExtension` lives in `src/trigger/extensions/whisper-cpp.ts` and does:
1. `apt-get install cmake build-essential` in the image.
2. Clone + build whisper.cpp.
3. Download requested GGML model weights.
4. Copy binary + weights into a known path exported as `WHISPER_CPP_BIN` / `WHISPER_MODEL_DIR`.

## Realtime subscription from Next.js

```tsx
"use client";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { z } from "zod";
import type { processRecording } from "@/trigger/processRecording";

const StageProgress = z.object({ /* ...shape from above */ });

export function RecordingProgress({ runId, accessToken }: { runId: string; accessToken: string }) {
  const { run } = useRealtimeRun<typeof processRecording>(runId, { accessToken });
  const stage = StageProgress.safeParse(run?.metadata?.stageProgress);
  if (!stage.success) return null;
  return <ProgressBar {...stage.data} />;
}
```

`accessToken` is a public-access token scoped to this single run — mint it server-side with `runs.retrieve(runId, { tags: ["public-access"] })` or via `auth.createPublicToken({ scopes: [...] })`.

## Do not

- Do not use SSE. Do not poll. Realtime is the only progress transport.
- Do not write your own job queue. Trigger.dev is the queue.
- Do not upload blobs through the task — pre-sign an R2 URL from the Next.js API and have the task PUT directly.
