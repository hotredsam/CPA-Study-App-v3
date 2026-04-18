# Task 4 — Segmentation Accuracy Report

**Generated:** 2026-04-18 (Night 2 overnight run)
**Method:** 2-signal pipeline (ffmpeg scene detection + plausibility filter)
**Status:** PROVISIONAL — fixture boundaries are not yet manually verified

## Disclaimer

`fixtures/ground-truth.json` contains GUESS boundaries (equally-spaced thirds/fifths).
Sam must watch the fixtures and update `tentativeQuestionBoundaries` entries, flipping
`flag` from `"GUESS"` to `"VERIFIED"`, before this report's accuracy numbers become
meaningful. See `sam-input/TODO.xml` blocker `2026-04-17-fixture-boundaries`.

## Pipeline configuration (Night 2)

| Signal | Status | Notes |
| ------ | ------ | ----- |
| A — ffmpeg scene detection | LIVE | threshold=0.3, parseFfmpegPctFromChunk progress |
| B — transcript cue matching | DEFERRED | Whisper pre-pass needs model file; regex cue scanner added to TODO |
| C — pHash template matching | STUB | Reference frames not yet provided; returns "unknown" classification |

**Fallback rule:** If <2 scene changes detected on a recording >120 s → equal thirds.

## Expected performance against fixtures (once dev runner runs)

| Fixture | Duration | Expected Q-count | Method | Boundary precision |
| ------- | -------- | ---------------- | ------ | ------------------ |
| sample-3q.mp4 | 658 s | 3 | ffmpeg scenes or equal-thirds | provisional |
| sample-5q.mkv | 641 s | 5 | ffmpeg scenes or equal-thirds | provisional |
| sample-long.mkv | ~1500 s | unknown | ffmpeg scenes | provisional |
| sample-corrupt.mkv | 6 MB truncated | — | pipeline should fail gracefully | N/A |

## How to run end-to-end (manual step for Sam)

```bash
pnpm trigger:dev   # in one terminal — starts the local Trigger.dev runner
pnpm dev           # in another terminal — starts Next.js

# Then go to http://localhost:3001/record and record OR:
# POST directly to the API with a fixture file:

# 1. Create a Recording row + get presigned upload URL
curl -X POST http://localhost:3001/api/recordings \
  -H "content-type: application/json" \
  -d '{"contentType":"video/mp4","durationSec":658}'

# 2. Upload the fixture to R2 (replace <uploadUrl> with the URL from step 1)
curl -X PUT "<uploadUrl>" --data-binary @fixtures/sample-3q.mp4 \
  -H "content-type: video/mp4"

# 3. Trigger the pipeline
curl -X POST http://localhost:3001/api/recordings/<recordingId>/complete

# 4. Watch progress at http://localhost:3001/recordings/<recordingId>/status
```

## Accuracy acceptance criteria (post-verification)

When Sam verifies boundaries:
- ±2 seconds of each VERIFIED boundary = PASS for that boundary
- Question count exact match = PASS for count check
- Accuracy score = (passing boundaries / total boundaries) × 100

## Next steps

1. Sam: watch fixtures, update `ground-truth.json` flags to "VERIFIED"
2. Remove the `2026-04-17-fixture-boundaries` blocker from `sam-input/TODO.xml`
3. Run the acceptance script above against sample-3q and sample-5q
4. Append actual timing + boundary delta table to this report
