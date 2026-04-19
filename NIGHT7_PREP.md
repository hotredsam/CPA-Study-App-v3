# Night 7 Prep

Generated: 2026-04-19

## State going in

Night 6 delivered a clean, fully green codebase. All tests pass. The pipeline runs end-to-end but has 4 known quality issues that need a live fix.

## Budget

$4.00 remaining (OAuth path for all Claude calls; no OpenRouter spend yet).

## Top priorities for Night 7

### P0 — Pipeline quality (the system isn't actually working yet)

1. **Tags always null** — The `claudeCliCall` prompt extraction fix was deployed but not re-tested. Run `scripts/fixture-runner.js`, check that `Question.tags` is non-null. If still null, add debug logging to `tagQuestion.ts` and trace the actual value returned by `runFunction`.

2. **Scores all 0** — `gradeQuestion.ts` calls `callClaude` directly (bypasses router). The LLM returns a response but `FeedbackPayload.safeParse` fails → stub with score 5. But DB shows 0, not 5, which means upsert may have a race or a pre-existing 0 stub. Add a `logger.info` after `feedbackParsed.success` / `.error` to see what's happening.

3. **StageProgress sparse** — Only 2 of ~8 expected rows are created per run. `makeThrottledStage` in `src/trigger/progress.ts` may be suppressing updates too aggressively. Investigate the throttle logic and change `create` to `upsert` keyed on `(recordingId, stage)`.

4. **Scene threshold verification** — Confirm threshold 0.15 fires scene changes on `fixtures/sample-3q.mp4`. If still equal-thirds, the fixture may not have enough scene changes — try with a real Becker video.

### P1 — Feature completeness

5. **Browse view** (`src/app/anki/AnkiBrowse.tsx`) — Search/filter all cards, bulk edit, CSV import. Night 5 stub.

6. **SSE streaming for chat** — Replace `POST /api/chat` fetch with `ReadableStream` SSE. Waiting on OpenRouter streaming confirmation.

7. **RecordClient.tsx split** — 981 lines. Extract `AudioControls`, `PermissionsPrompt`, `UploadProgress` into `src/components/record/`.

### P2 — Hardening

8. **Pino structured logging** — Install pino, replace logger.ts with pino-based implementation, add request ID middleware.
9. **Rate limiting** — Add simple in-memory token bucket on `/api/recordings` POST and `/api/chat`.
10. **OpenAPI export** — `next-swagger-doc` from schema + route types.

## Pre-flight checklist for Night 7

- [ ] `pnpm dev` starts cleanly (no TS errors)
- [ ] Postgres is up (`pg_isready`)
- [ ] Trigger.dev runner is started (`npx trigger.dev@latest dev`)
- [ ] `pnpm test` → 173/173
- [ ] `pnpm e2e` → 15/15
- [ ] `.env` has `OPENROUTER_KEY_ENC` set (for P1 OpenRouter path testing)

## File map for Night 7 agent

| Issue | File(s) |
|-------|---------|
| Tags null | `src/trigger/tagQuestion.ts`, `src/lib/ai/pipeline-tag.ts`, `src/lib/llm/router.ts` |
| Scores 0 | `src/trigger/gradeQuestion.ts`, `src/lib/schemas/feedback.ts`, `src/lib/prompts/grading.ts` |
| Stage progress | `src/trigger/progress.ts`, all trigger tasks |
| Scene detection | `src/trigger/segmentRecording.ts`, `src/lib/ffmpeg.ts` |
| Browse view | `src/app/anki/AnkiBrowse.tsx` |
| SSE chat | `src/app/api/chat/route.ts`, `src/app/review/[recordingId]/ReviewClient.tsx` |
| RecordClient split | `src/app/record/RecordClient.tsx` → `src/components/record/` |
