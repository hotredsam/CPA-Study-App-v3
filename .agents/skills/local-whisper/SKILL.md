---
name: local-whisper
description: Best-practices wrapper for running whisper.cpp locally via smart-whisper from Node. Use whenever implementing transcription, Whisper pre-pass, or anything that needs speech-to-text — Task 4 (pre-pass) and Task 6 (per-clip transcription) both load this.
---

# Local Whisper (via smart-whisper / whisper.cpp)

No OpenAI API. No audio leaves the machine. Model weights ship inside the Trigger.dev task image via a build extension.

## Model selection

| Use case | Model | Reasoning |
|---|---|---|
| Fast pre-pass (Task 4 Signal B) | `ggml-tiny.en.bin` | We only need "next question" cue detection — accuracy secondary. |
| Per-clip transcription (Task 6, default) | `ggml-small.en.bin` | Best tradeoff; ~5–10× realtime on `large-2x`. |
| Speed-critical (if `small.en` too slow) | `ggml-base.en.bin` | |
| Accuracy-critical (spot-checks show errors) | `ggml-medium.en.bin` | Fall-forward only; cost: slower transcription. |

All models are **English-only** — Sam records in English. Never ship multilingual weights.

## Invocation shape

```ts
import { Whisper } from "smart-whisper";

const whisper = new Whisper(MODEL_PATH); // cached inside the task container
const output = await whisper.transcribe(wavPath, {
  language: "en",
  wordTimestamps: true,
  onProgress: (pctOrStderrLine) => { /* see below */ },
});
```

## Progress parsing (stderr line shape)

whisper.cpp emits lines like:

```
[00:00:01.440 --> 00:00:05.120]   So the question is asking about ...
```

Regex: `/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})\]/`

`pct = lastEnd / clipDuration`. Throttle `metadata.set()` to ≤1 Hz (see `trigger-dev-v3` skill).

## Word-timestamp output schema

```ts
type Transcript = {
  segments: Array<{
    start: number; // seconds
    end: number;
    text: string;
    words: Array<{ start: number; end: number; word: string; probability?: number }>;
  }>;
  durationSec: number;
  noSpeechDetected: boolean;
};
```

## "No speech detected" heuristic

Mark `noSpeechDetected: true` when any of:
- `segments.length === 0`
- Total voiced duration < 1.5s (sum of `(end - start)` across segments)
- Every segment's text is a single `[BLANK_AUDIO]` or similar marker

Downstream: `Question.noAudio = true`, skip consulting grading.

## Model weight caching in Trigger.dev build extensions

```ts
// trigger.config.ts (skeleton — flesh out in Task 3 / Task 6)
import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "cpa-study-v3",
  build: {
    extensions: [
      additionalFiles({
        files: ["./models/ggml-small.en.bin", "./models/ggml-tiny.en.bin"],
      }),
      // whisperCppInstall() — custom build extension (Task 3 writes this)
    ],
  },
});
```

The `whisper.cpp` binary is installed via a custom extension that runs `apt-get install cmake && git clone && cmake --build` during image build. Model weights are downloaded at build time (cacheable) and copied into the image.

## Do not

- Do not call OpenAI Whisper API. Ever.
- Do not transcribe raw video — extract audio first with `ffmpeg -i clip.webm -vn -ac 1 -ar 16000 -f wav clip.wav`.
- Do not re-download model weights at task runtime.
