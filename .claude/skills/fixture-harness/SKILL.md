---
name: fixture-harness
description: How to write deterministic fixture tests against fixtures/sample-*.webm with ground-truth timestamps. Use when implementing verification for Tasks 4–7 or any integration test that needs a real recording.
---

# Fixture Harness

Ground-truth lives in `fixtures/README.md` and the machine-readable counterpart `fixtures/ground-truth.json`. Tests read the JSON.

## ground-truth.json shape

```json
{
  "sample-3q.webm": {
    "sourceUrl": "https://...",
    "durationSec": 485,
    "questions": [
      {
        "id": 1,
        "startSec": 12.4,
        "endSec": 158.7,
        "section": "AUD",
        "correctAnswer": "C",
        "userAnswer": "B",
        "transcriptSpotChecks": [
          { "atSec": 22.1, "word": "audit", "tolerance": 0.25 },
          { "atSec": 48.5, "word": "risk",  "tolerance": 0.25 }
        ],
        "questionExcerpt": "Which of the following best describes...",
        "lowConfidence": false
      }
    ]
  }
}
```

## Typical test (Vitest, integration)

```ts
import { describe, it, expect } from "vitest";
import { loadGroundTruth, withinTolerance } from "@/lib/test/fixtures";
import { segmentRecording } from "@/trigger/segmentRecording";

describe("segmentRecording — sample-3q.webm", () => {
  const gt = loadGroundTruth("sample-3q.webm");

  it("produces exactly 3 clips with boundaries within ±2s", async () => {
    const clips = await segmentRecording.runDirect("fixtures/sample-3q.webm");
    expect(clips).toHaveLength(gt.questions.length);
    for (const [i, clip] of clips.entries()) {
      expect(withinTolerance(clip.startSec, gt.questions[i].startSec, 2.0)).toBe(true);
      expect(withinTolerance(clip.endSec,   gt.questions[i].endSec,   2.0)).toBe(true);
    }
  });
});
```

## Ground-truth generation (best-guess initial run)

When a new fixture is added:

1. Run `ffprobe` for exact duration.
2. Run local `whisper.cpp` with `tiny.en` on the full audio.
3. Scan transcript for "next question" / "question \d+" cues → initial question start timestamps.
4. Run `ffmpeg -vf "select='gt(scene,0.3)',showinfo"` for scene cuts.
5. Combine (prefer verbal cues when within 5s of a scene cut) → initial boundary list.
6. For each question, extract 1 keyframe, OCR the first line (Tesseract is OK *here* — quick and human-reviewed) → first 80 chars of question text.
7. Write `fixtures/README.md` (human-readable) and `fixtures/ground-truth.json` (machine-readable) with `lowConfidence: true` on every question.
8. Append a `sam-input/TODO.xml` item asking Sam to tighten the ground truth during his first review session — once he watches the fixture, he can flip `lowConfidence` to `false` and correct any drift.

## withinTolerance helper

```ts
export const withinTolerance = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
```

## Do not

- Do not commit `.webm` files — they're big and licensed from YouTube creators. `.gitignore` excludes them. Only `fixtures/README.md` + `fixtures/ground-truth.json` commit.
- Do not fix production code to make a bad ground-truth pass. Fix the ground truth instead.
