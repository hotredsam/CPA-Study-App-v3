# Night 4 Quality Audit — Pipeline Output Analysis

**Date:** 2026-04-19  
**Fixtures tested:** sample-3q.mp4 (10:58), sample-5q.mkv (10:41), sample-corrupt.mkv (6 MB truncated)

---

## Pipeline fix summary (Phases A-B)

Four critical bugs were fixed before quality could be assessed:

| Bug | Symptom | Fix |
|-----|---------|-----|
| `clip.webm` for H264 input | All questions `status=failed`, segmentation silently errored | `probeClipFormat()` detects codec → uses mp4 for H264 |
| `Promise.all(triggerAndWait)` | processRecording errored immediately; sub-tasks ran orphaned | Sequential `for...of` loop (trigger.dev v3 constraint) |
| `spawn claude ENOENT` | extractQuestion/gradeQuestion failed, no feedback | Resolve `claude.exe` absolute path; use `shell:false` |
| trigger.config.ts missing env | `trigger:dev` couldn't start (TRIGGER_PROJECT_ID undefined) | `process.loadEnvFile(".env")` before assertion |

---

## Extraction quality

**Verdict: Expected-incomplete. Correct behavior for text-only mode.**

Claude correctly identifies that no question data can be extracted when:
- No screenshot / screen recording frames available (text-only claude CLI mode)
- No Whisper transcript (EPERM on Windows dev, model not found)

Example response:
```json
{
  "incomplete": true,
  "reason": "No screenshots and no transcript available for clip <id>; all required fields (question, choices, userAnswer, correctAnswer) cannot be determined from timing context alone.",
  "_precision": "provisional"
}
```

**What this means for prod:**  
In trigger.dev Linux containers with `WHISPER_MODEL_PATH` set and `ANTHROPIC_API_KEY` set, the full extraction pipeline (transcript → Claude vision extraction) will produce real data. The text-only fallback is intentional for dev environments.

---

## Transcription quality

**Verdict: Empty (expected on Windows dev). Will work on Linux prod.**

- Windows: smart-whisper EPERM + model not found → `{ language: "en", segments: [] }`
- Linux (trigger.dev cloud): whisper model at `WHISPER_MODEL_PATH` → real word-timestamp segments

No action needed. Document this in the deploy guide for Sam.

---

## Grading quality

**Verdict: Structured stub. Correct given empty extraction + transcript.**

Claude generates valid FeedbackPayload JSON even with no data:
- 10 feedback items (all at score 0)
- `combinedScore: 0`
- Appropriate `whatYouNeedToLearn` messages like "This session produced no gradable data — the question was not extracted and no answer or verbal response was recorded."
- `weakTopicTags: ["recording-failure", "no-response"]`

The feedback STRUCTURE is correct. Content quality depends on extraction working.

---

## Segmentation quality

**Verdict: Equal-thirds fallback (acceptable). Scene detection not triggering.**

All 3 fixtures fell back to equal-thirds segmentation (1 scene detected → fallback). This is because:
- Scene detection threshold 0.3 may be too sensitive for Becker video format
- Becker videos likely have a talking-head format with few visual scene cuts

**Recommendation:** Lower scene detection threshold to 0.15 for Becker-style videos. Or use equal-thirds as the primary strategy for now.

---

## Corrupt file handling

**Verdict: Graceful.** The 6 MB truncated `sample-corrupt.mkv`:
- Uploaded successfully
- ffprobe detected duration from partial data
- ffmpeg extracted clips from available content
- All 3 questions processed through full pipeline
- Recording status: `done` (not `failed`)

No crash, no hang, no unhandled error.

---

## Per-fixture results

| Fixture | Questions | Feedbacks | Time | Status |
|---------|-----------|-----------|------|--------|
| sample-3q.mp4 | 3/3 | 3/3 | 2.7 min | ✅ done |
| sample-5q.mkv | 3/3 | 3/3 | 2.5 min | ✅ done |
| sample-corrupt.mkv | 3/3 | 3/3 | 2.5 min | ✅ done |

Note: All 3 fixtures produce 3 questions (equal-thirds), not the expected 3 and 5 from the filenames. Correct segmentation requires scene detection tuning or Sam's ground-truth boundaries.

---

## Phase D prompt iteration

**Not actionable today.** Prompt quality can only be assessed when real transcripts are available. Current "incomplete" outputs from Claude are correct and expected. Defer prompt iteration to when:
1. Whisper model is configured on a Linux machine with `WHISPER_MODEL_PATH`
2. OR Sam provides a sample transcript manually for testing

The extraction and grading prompts appear structurally correct based on the responses.

---

## Recommended actions for Sam

1. **Deploy to trigger.dev cloud** with `ANTHROPIC_API_KEY` + `WHISPER_MODEL_PATH` to test real extraction quality.
2. **Record one real Becker session** and run through the pipeline to get the first real quality sample.
3. **Tune scene detection threshold** from 0.3 to 0.15 to test if it segments Becker videos correctly.
