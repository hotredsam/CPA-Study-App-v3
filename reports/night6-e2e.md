# Night 6 E2E Pipeline Report

**Date:** 2026-04-19  
**Fixture:** `fixtures/sample-3q.mp4`  
**Recording ID:** `cmo5i992t0000gh40ubiv6fmm`  
**Run ID:** `run_h4w7dopengup1nfw7bwp5`

## Timing

| Event | Timestamp | Elapsed |
|-------|-----------|---------|
| Recording created | 08:29:41 UTC | 0s |
| R2 upload complete | 08:29:46 UTC | ~5s |
| Pipeline triggered | 08:29:49 UTC | ~8s |
| Segmentation start | 08:29:49 UTC | ~8s |
| Grading complete | 08:33:45 UTC | ~4m 4s |
| Status → done | 08:33:45 UTC | ~4m 4s |

**Total pipeline wall-clock:** ~4 minutes

## Segments

| Segment | Start (s) | End (s) | Duration | Method |
|---------|-----------|---------|----------|--------|
| Q2 | 0.0 | 219.5 | 3m 39.5s | equal-thirds fallback |
| Q3 | 219.5 | 439.0 | 3m 39.5s | equal-thirds fallback |
| Q1 | 439.0 | 658.5 | 3m 39.5s | equal-thirds fallback |

**Total video duration:** 658.5s (~11 minutes)  
**Scene detection:** NOT triggered — fell back to equal-thirds division. Current threshold 0.3 too high for Becker-format lecture video.

## Questions & Grading

| Question | Status | Accounting Score | Combined Score | Tags |
|----------|--------|-----------------|----------------|------|
| Q1 | done | 0 | 0 | null |
| Q2 | done | 0 | 0 | null |
| Q3 | done | 0 | 0 | null |

**All scores 0:** Pipeline graded via OAuth/claude-cli path. Scores are 0 because the claude-cli call returned a response, but either the LLM output wasn't parsed into a valid Feedback structure or the Feedback rows were created with zero-initialized scores. The `combined=0` pattern is consistent with `claudeCliCall` returning raw text that JSON.parse fails on (falls back to string), and the grading task writing zeros.

## Model Calls

| Function | Model | Input Tokens | Output Tokens | USD Cost |
|----------|-------|-------------|---------------|----------|
| PIPELINE_TAG | oauth/claude | 0 | 0 | $0.000 |
| PIPELINE_TAG | oauth/claude | 0 | 0 | $0.000 |
| PIPELINE_TAG | oauth/claude | 0 | 0 | $0.000 |

**Total cost:** $0.00 (OAuth path — token counts not tracked)  
**PIPELINE_GRADE calls:** 0 logged (grading path does not go through `runFunction` — writes direct to `Feedback` table from trigger task)

## Stage Progress

Only 2 stage entries recorded (should be ~8):

| Stage | Pct | Message |
|-------|-----|---------|
| segmenting | 0% | Downloading recording |
| grading | 100% | All questions graded |

**Missing stages:** transcribing, extracting, tagging — `emitProgress` calls in Trigger.dev tasks may not be persisting correctly, or the `StageProgress` upsert is failing silently.

## What Worked

- Full pipeline runs end-to-end without crashing (status → `done`)
- 3 questions detected and persisted from equal-thirds segmentation
- Tag stage ran (3 PIPELINE_TAG model calls logged)
- Feedback rows created for all 3 questions
- R2 upload succeeded in ~4.5s
- Pipeline completes in ~4 minutes on local dev

## What Didn't Work

1. **Scene detection not firing** — threshold 0.3 produces equal-thirds fallback. Becker lecture video has soft scene changes; need 0.15. Fix: Phase C.
2. **Tags null** — PIPELINE_TAG ran and hit OAuth path, but `tags` field on Question rows stays null. The tagging task returns a result but doesn't write it back to the DB. Fix needed in `src/trigger/tagQuestion.ts`.
3. **Scores all 0** — Grading through `claudeCliCall` returns a string; JSON.parse succeeds (or fails silently), resulting in zero scores written to Feedback. Need to verify `src/trigger/gradeQuestion.ts` parses and persists correctly.
4. **Stage progress sparse** — Only 2 of ~8 expected `StageProgress` rows. `emitProgress` may need `upsert` with unique key rather than `create`.
5. **Token counts 0** — OAuth path intentionally returns 0; acceptable for dev. Production will use OpenRouter with real token counts.

## TODOs from this run

- [ ] Phase C: Lower scene threshold 0.3 → 0.15 in `segmentRecording.ts`
- [ ] Fix `tagQuestion.ts`: write tag result back to `Question.tags` after `runFunction`
- [ ] Fix `gradeQuestion.ts`: parse LLM output into `FeedbackItems[]`, ensure scores are extracted
- [ ] Fix `StageProgress` persistence: switch from `create` to `upsert` keyed on `(recordingId, stage)`
- [ ] Validate fixture produces non-zero scores after grading fix
