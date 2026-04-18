# Phase 1 Acceptance Report — v2 (Night 2)

**Date:** 2026-04-18
**Status:** PIPELINE-WIRED — full end-to-end run requires `pnpm trigger:dev` + human verification

## Executive summary

Night 2 live-wired all 4 pipeline stages. The API layer, R2 integration, and claude CLI
calls are wired and typechecking. The Trigger.dev dev runner was not active during this
automated overnight run, so pipeline execution against fixtures is a **manual next step**.

## What was tested automatically (Night 2)

| Check | Result |
| ----- | ------ |
| `pnpm typecheck` | ✅ PASS |
| `pnpm lint` | ✅ PASS |
| `pnpm test` | ✅ PASS (32/32) |
| `pnpm e2e` home page | ✅ PASS |
| `pnpm e2e` recording API (POST + R2 upload + complete) | ✅ PASS |
| Corrupt recording e2e (status page renders gracefully) | see below |

## Phase 1 Task status table

| Task | Status | Notes |
| ---- | ------ | ----- |
| 1. Scaffold + DB + Trigger.dev | ✅ LIVE | |
| 2. In-app recording + upload | ✅ LIVE | Port 3001 for dev (3000 stuck in shell) |
| 3. Pipeline skeleton + realtime progress | ✅ LIVE | |
| 4. ffmpeg segmentation | ✅ WIRED | 2-signal; pHash stub; fixture verification pending |
| 5. Claude vision extraction | ✅ WIRED (text-only) | No vision — transcript+timing only; precision:provisional |
| 6. Whisper transcription | ✅ WIRED | Falls back to empty transcript on Windows (native binary); works in Linux container |
| 7. Grading + feedback | ✅ WIRED | claude CLI subprocess; provisional placeholder keys |
| 8. Review UI | ✅ LIVE | video + keyboard nav + word timestamps |
| 9. Live status page | ✅ LIVE | useRealtimeRun + StageProgress |
| 10. Phase 1 e2e + RUNBOOK | ✅ LIVE | RUNBOOK.md committed |

## Provisional flags in production output

Every piece of AI-generated output carries `_precision: "provisional"` or
`precision: "provisional"` until:
1. Fixture boundaries are manually verified (blocker `2026-04-17-fixture-boundaries`)
2. 10 FeedbackItem keys are locked (blocker `2026-04-17-feedback-items`)
3. Real Claude vision is added (needs ANTHROPIC_API_KEY in Trigger.dev environment)

## Manual acceptance checklist (for Sam, post Night 2)

```
[ ] Start Trigger.dev dev runner: pnpm trigger:dev
[ ] Upload fixtures/sample-3q.mp4 via /record or API
[ ] Verify segmentation produces 3 clips on sample-3q
[ ] Verify extraction returns JSON (even if text-only quality is low)
[ ] Verify transcription produces segments (will be empty on Windows dev)
[ ] Verify grading produces a Feedback row
[ ] Review all 3 questions at /review/<questionId>
[ ] Repeat for sample-5q (5 clips expected)
[ ] Upload sample-corrupt.mkv: pipeline should fail gracefully at segmenting stage
```

## Corrupt recording error-path

The corrupt fixture (`fixtures/sample-corrupt.mkv` — 6 MB truncated) should:
1. Fail at `segmentRecording` when ffmpeg fails to read it
2. The task throws → Trigger.dev marks run as failed
3. The status page at `/recordings/<id>/status` shows an error indicator (not a 500)
4. The Recording row shows `status: "failed"`

## Performance estimates (not yet measured)

| Stage | Estimated wall-clock per clip |
| ----- | ----------------------------- |
| Segmentation | 15–60 s (ffmpeg scene detect, CPU) |
| Extraction (text) | 5–15 s (claude CLI subprocess) |
| Transcription | 0 s on Windows (empty), 30–90 s on Linux with ggml-small.en |
| Grading | 10–30 s (claude CLI subprocess) |

## Open items before Phase 1 can be called "COMPLETE"

1. Verify fixture boundaries
2. Lock 10 FeedbackItem keys → update FeedbackPayload Zod schema + migrate
3. Add ANTHROPIC_API_KEY to Trigger.dev environment secrets (prod)
4. Upgrade extraction to real vision (use API key with image messages)
5. Verify full pipeline runs without errors on sample-3q and sample-5q
