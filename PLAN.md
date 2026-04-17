# CPA Study System — Build Plan (v2)

## Overview

A web app that ingests screen recordings of Becker CPA practice question sessions, extracts each question, grades both accounting knowledge and verbal consulting technique, and returns structured feedback. Replaces the legacy Electron/React bot with a current-gen AI pipeline and in-app recording.

## What changed in v2

- **Job orchestration**: BullMQ + Redis + Fly.io worker → **Trigger.dev v3**. No worker service to deploy, no Redis to run, native TypeScript, built-in observability, built-in realtime progress streams to the UI.
- **Transcription**: OpenAI Whisper API → **local `whisper.cpp`** running inside the Trigger.dev task container. No audio leaves our infrastructure. Word-level timestamps supported natively.
- **Video processing**: `ffmpeg` runs locally in the task container (was already the plan — now explicit, with progress parsing).
- **Progress reporting is a first-class concern**. Every long stage streams progress to the UI via Trigger.dev realtime. The review/status pages show live progress bars for each stage.
- **AI analysis split**: local-first for text extraction from audio/video, Claude API for analysis only.
  - Local: `ffmpeg` segmentation, `whisper.cpp` transcription, `ffmpeg` thumbnail + keyframe extraction.
  - Remote (Claude API): structured question/answer extraction from keyframes (vision), grading/feedback generation (text).

## Locked Decisions

- **Language / runtime**: TypeScript on Node 22. Single stack keeps the video + AI pipeline in one language.
- **Frontend**: Next.js (App Router) + Tailwind. Desktop-first, optimized for 16:9 Chrome on the 57" Odyssey G9.
- **Backend**: Next.js route handlers for the API. Long jobs run on **Trigger.dev v3** tasks — no separate worker deployment.
- **Database**: Postgres via Prisma. Stores recordings, questions, feedback, user history, textbook metadata, stage progress snapshots.
- **Blob storage**: Cloudflare R2 (S3-compatible). Raw recordings, per-question clips, extracted audio, keyframe images.
- **Recording**: In-app recording via `MediaRecorder` + `getDisplayMedia` from day one, with mic and source selection.
- **Transcription**: `whisper.cpp` via the `smart-whisper` (or `nodejs-whisper`) npm package, running inside the Trigger.dev task container. Default model: `ggml-small.en.bin` (good accuracy / reasonable CPU speed). Upgrade to `ggml-medium.en` if accuracy lags.
- **AI models**: Claude Sonnet 4.6 for vision-based question/answer extraction from keyframes and for grading.
- **Segmentation strategy**: `ffmpeg` scene detection as a baseline, augmented by (a) a fast local Whisper pre-pass producing transcript cues like "next question" and (b) perceptual-hash template matching against reference Becker UI frames (question view vs feedback view). Visual + verbal + template signals combined.
- **Hosting**: Vercel for frontend + API routes. **Trigger.dev Cloud** for tasks. Postgres on Neon. R2 on Cloudflare.
- **Task machine size**: Trigger.dev `large-2x` or `large-4x` to give `whisper.cpp` enough CPU to run at ~5–10× realtime on the `small.en` model.
- **Progress transport**: Trigger.dev task `metadata` + `@trigger.dev/react-hooks` `useRealtimeRun` on the client. No custom SSE or polling.
- **Auth**: Single-user for MVP, no auth. Revisit in Phase 2 if multi-user is needed.

## Out of Scope

- Offline AI inference for *grading* (grading stays on Claude API — only transcription/segmentation are local).
- Multiple study modes (one unified mode with filtering after the fact).
- Native desktop app.
- Mobile-first UI.

---

## Phase 1 — MVP

Goal: Record a Becker question session in-app, process it end-to-end with visible progress, and review graded feedback one question at a time.

### Task 1: Project scaffold, database schema, Trigger.dev init

**What**: Stand up the Next.js app, wire up Prisma with Postgres, init Trigger.dev in the same repo. Define the initial schema for `Recording`, `Question`, `Feedback`, and `StageProgress`. Add Tailwind, a minimal layout, and a home page.

**Why**: Everything else depends on this. Lock it in before building features. Trigger.dev's monorepo-style init means tasks live in `/trigger` alongside the Next.js app — no second repo.

**Scope**:

- Next.js (App Router) + TypeScript + Tailwind.
- Prisma schema + local Postgres via Docker Compose.
- Tables:
  - `Recording` (status enum, r2 key, duration, createdAt)
  - `Question` (FK to Recording, clip r2 key, start/end ts, transcript JSON, extracted fields JSON, status enum)
  - `Feedback` (FK to Question, 10 feedback items JSON, scores)
  - `StageProgress` (FK to Recording, stage enum, pct 0–100, etaSec, message, updatedAt) — optional persistence layer behind realtime, useful for post-hoc debugging.
- Trigger.dev v3 initialized: `trigger.config.ts`, `/trigger` directory, dev runner working via `npx trigger.dev@latest dev`.
- `.env.example` covering DB, R2, Anthropic, Trigger.dev credentials. No OpenAI key needed.

**Verification**: `pnpm dev` serves the home page. `prisma studio` shows the four empty tables. `npx trigger.dev dev` registers a "hello world" task that the Next.js app can trigger from a route handler.

**Commit when**: Home page loads, Prisma migration applies, Trigger.dev dev task round-trips.

### Task 2: In-app recording with upload progress

**What**: Build the in-app recording flow. User picks a mic and a screen source, records the session; on stop the blob streams to R2 with a visible progress bar, and a `Recording` row is created with status `uploaded`.

**Why**: This is the MVP entry point. Everything downstream assumes a recording has landed in R2. Upload for a 30-minute study session can be hundreds of megabytes — users must see progress.

**Scope**:

- Recording page with mic + display source pickers (`enumerateDevices`, `getDisplayMedia`).
- `MediaRecorder` capturing combined video + mic audio to WebM (VP9 + Opus).
- Live preview of the capture + elapsed time + stop button.
- On stop: multipart upload to R2 via presigned URLs with a **progress bar** showing bytes uploaded / total.
- DB row created on completion with status `uploaded`; Trigger.dev `processRecording` task kicked off automatically.
- Error states: permissions denied, no mic selected, upload failure (with retry).

**Verification**: Record a ~5 minute session with 2–3 Becker questions. Watch the upload progress bar fill from 0 → 100%. Confirm the row exists in the DB and the file plays from R2. Trigger.dev dashboard shows `processRecording` task kicked off.

**Commit when**: In-app recording round-trips end-to-end with a visible upload progress bar.

### Task 3: Trigger.dev pipeline skeleton with realtime progress

**What**: Implement the four-stage pipeline as Trigger.dev tasks chained together. Each stage emits progress updates via `metadata.set()`. Front-end subscribes with `useRealtimeRun`.

**Why**: The pipeline is the spine of the app. Building the skeleton with progress plumbing in place before implementing each stage means every stage "just works" on the UI the moment it's wired up.

**Scope**:

- Four tasks in `/trigger`:
  - `segmentRecording` (Task 4 fills in)
  - `extractQuestion` (Task 5)
  - `transcribeQuestion` (Task 6 — local Whisper)
  - `gradeQuestion` (Task 7)
- Orchestrator task `processRecording` that: calls `segmentRecording`, then fans out `extractQuestion` + `transcribeQuestion` per clip (parallel), then `gradeQuestion` per question.
- Status enum on `Recording`: `uploaded → segmenting → processing_questions → done | failed`.
- Per-`Question` status: `pending → extracting → transcribing → grading → done | failed`.
- Every task updates `metadata` with `{ stage, pct, etaSec, message }` on a throttled cadence (~1/sec max to avoid rate limits).
- Trigger.dev build extensions: install `ffmpeg` and `whisper.cpp` binary into the task image; download the Whisper model weights at build time and cache.
- Retry policy: 3 retries with exponential backoff on transient errors; no retries on structural errors (e.g., model returned invalid JSON — surface immediately).

**Verification**: Trigger the pipeline with stub implementations that each `await sleep(2000)` and update progress from 0 → 100%. From the UI, all stages advance in real time with smooth progress bars. Force a stub failure and confirm the job moves to `failed` with a readable error in the UI.

**Commit when**: Status transitions and progress streaming work end-to-end with stubbed stages.

### Task 4: Video segmentation (local ffmpeg + progress)

**What**: Implement `segmentRecording` — split a recording into one clip per question using three combined signals: `ffmpeg` scene detection, transcript cues from a fast local Whisper pre-pass, and perceptual-hash template matching against reference Becker UI frames.

**Why**: Every downstream stage works on one question at a time. Segmentation quality directly bounds grading quality. `ffmpeg` scene detection alone is unreliable on screen recordings — combining three signals is how we hit the accuracy bar.

**Scope**:

- Download the recording from R2 into the task's tmp dir.
- **Signal A — scene detection**: `ffmpeg -vf "select='gt(scene,0.3)',showinfo"` → list of candidate cut points.
- **Signal B — transcript cues**: run `whisper.cpp` with `ggml-tiny.en` (fast, rough) on the full audio to produce a low-quality transcript. Scan for regex-matched cues: `next question`, `question \d+`, `moving on`, etc.
- **Signal C — pHash template matching**: sample frames at 1fps, compute perceptual hash, compare against bundled reference hashes for "Becker question view" vs "Becker feedback view". Transitions between the two hash classes are strong boundary signals.
- Merge signals into final clip boundaries. Prefer template transitions; fall back to scene cuts confirmed by nearby transcript cues.
- **Progress reporting**: parse `ffmpeg` stderr `time=HH:MM:SS.ms` against total duration; update task metadata each second. Separate sub-progress bars for "scene detection", "audio pre-pass transcription", "template matching", "writing clips".
- Output: N clips written to R2 + N `Question` rows with timing metadata + 1 thumbnail per question (first keyframe after the question boundary).

**Verification**: On `fixtures/sample-3q.webm`, produces exactly 3 clips with boundaries within ±2 seconds of ground truth. UI shows four smooth progress bars during processing. Thumbnails render correctly.

**Commit when**: Sample fixture segments correctly, thumbnails render, and progress bars reflect reality.

### Task 5: Question and answer extraction (Claude vision on keyframes)

**What**: For each clip, sample keyframes from (a) the question view and (b) Becker's feedback view, send them to Claude Sonnet 4.6 with a structured prompt that returns JSON: `question`, `choices[]`, `userAnswer`, `correctAnswer`, `beckerExplanation`, `section`.

**Why**: Grading needs structured question data. Local OCR (Tesseract) misses Becker's UI structure — which choice the user picked, which is marked correct, which explanation panel is showing. Claude vision handles the structure cleanly.

**Scope**:

- Keyframe sampling: 2–3 frames from the question-view span, 2–3 from the feedback-view span (using Task 4's pHash classification).
- Structured prompt with explicit JSON schema; `response_format` / tool-use pattern that enforces shape.
- Persist parsed result to `Question.extracted` as JSON.
- Graceful handling: if Claude returns incomplete data, mark the question `incomplete` (so the user still sees the clip + transcript) rather than failing the whole pipeline.
- Progress reporting: one step per keyframe uploaded + one step per Claude call. Simple pct = completed / total.

**Verification**: On the sample fixture, all 3 questions extract with correct question text, choices, and answers, verified manually against the recording. A deliberately-corrupted recording marks questions `incomplete` without crashing the pipeline.

**Commit when**: Extraction is accurate on the fixture and graceful on the corrupt case.

### Task 6: Local Whisper transcription with progress

**What**: Extract audio from each clip with `ffmpeg`, transcribe with `whisper.cpp` running inside the Trigger.dev task container, store the transcript and word-level timestamps on the `Question` row.

**Why**: The consulting/verbal reasoning score is graded against the user's spoken reasoning. Running Whisper locally keeps audio on our infrastructure and eliminates a recurring per-minute API cost. No transcript, no consulting grade.

**Scope**:

- Extract per-clip audio: `ffmpeg -i clip.webm -vn -ac 1 -ar 16000 -f wav clip.wav`.
- Run `whisper.cpp` (via `smart-whisper` npm bindings or a subprocess call) with:
  - Model: `ggml-small.en.bin` by default (English-only, ~466 MB, ~5–10× realtime on a `large-2x` Trigger.dev machine).
  - Flags: `--output-json --word-thresholds` (word-level timestamps).
  - Language: `en`.
- Parse the JSON output into `{ segments: [{ start, end, text, words: [{ start, end, word }] }] }` and store on `Question.transcript`.
- Mark clips with no detectable speech as `noAudio: true` and skip consulting grading for them.
- **Progress reporting**: `whisper.cpp` prints `[MM:SS.fff --> MM:SS.fff]` lines to stderr as it processes. Parse stderr line-by-line; pct = last emitted end-timestamp / clip duration. Update task metadata per line (throttled to 1/sec).
- Model weights cached in the task image (downloaded in Trigger.dev build extension) — no cold-start download cost.

**Verification**: Sample fixture transcripts are legible and word timings align within ±250ms on spot-checked words. Progress bar advances smoothly from 0 → 100% during transcription. Cost tracker shows zero OpenAI spend.

**Commit when**: Transcription runs cleanly on the sample fixture with a smooth progress bar.

### Task 7: Grading and feedback generation (Claude API)

**What**: One Claude Sonnet 4.6 call per question that takes the extracted question, user's answer, Becker's explanation, and the user's transcript, and returns the 10-item feedback payload. Persist to `Feedback`.

**Why**: This is the core value prop. Every other task exists to get the right inputs into this call.

**Scope**:

- Lock the 10 feedback items (see Open Questions — must be resolved before this task starts).
- One structured prompt returning all 10 items as JSON, validated on write.
- Scores: accounting (0–10), consulting (0–10), combined (0–10) with per-section weighting.
- "What you need to learn" text when the user got the question wrong or flagged uncertainty.
- Persist to `Feedback` with FK to `Question`.
- Progress: simple pct = graded questions / total questions for the recording.

**Verification**: On the sample fixture, each question has a complete `Feedback` record with all 10 items populated, scores in range, and combined score matches the weighting rule.

**Commit when**: Grading runs on the full fixture and the output schema validates.

### Task 8: Review UI

**What**: Single-question review page — one question at a time, shows the question, user's answer, correct answer, transcript with clickable timestamps, and the 10 feedback items. Prev/next navigation.

**Why**: This is the user's primary surface for learning from each session.

**Scope**:

- Route: `/review/[questionId]`.
- Renders question, answer state, transcript with clickable word-timestamps (jump the clip), 10 feedback items.
- Prev/next buttons + keyboard arrow support.
- Home page lists recent recordings with status chips and a "Review" link to the first question.

**Verification**: After processing the sample fixture, the user can browse all 3 questions via prev/next and see every feedback item rendered correctly. Clicking a word in the transcript scrubs the video player to that timestamp.

**Commit when**: Review UI works end-to-end on a processed recording.

### Task 9: Live pipeline status view

**What**: Per-recording status page that renders the realtime progress stream from Trigger.dev. Shows every stage, every progress bar, every error.

**Why**: The source doc calls out "clear real-time view of what the processing pipeline is doing" as a UX requirement. Long-running jobs feel broken without it. Trigger.dev's realtime makes this cheap.

**Scope**:

- Route: `/recordings/[id]/status`.
- Uses `@trigger.dev/react-hooks` `useRealtimeRun` to subscribe to the orchestrator task.
- Renders, for each stage:
  - stage name, state (pending / running / done / failed)
  - progress bar bound to task metadata `pct`
  - ETA text from metadata `etaSec`
  - current message (e.g., "Transcribing clip 2 of 3")
- Per-question sub-rows showing extraction + transcription + grading progress.
- Error display: failing stage name, error message, retry button.
- Auto-redirects to `/review/[firstQuestionId]` when the pipeline finishes.

**Verification**: Start a recording; watch every stage advance with live progress bars. Force a failure (corrupt the blob in R2) and confirm the error surfaces with a usable retry.

**Commit when**: Status view reflects pipeline state accurately in real time, including error cases.

### Task 10: Phase 1 end-to-end

**What**: Full pipeline test on a fresh, unseen 5-question session recorded in-app. Fix anything that breaks. Write a short `RUNBOOK.md` covering how to record, troubleshoot, reprocess, and rerun.

**Why**: Forces an integration check against something that hasn't been tuned to the fixture.

**Scope**:

- Record a fresh 5-question session in-app.
- Let it process end-to-end; observe progress bars throughout.
- Review every question's feedback in the UI.
- Measure total wall-clock time; if Whisper transcription is the bottleneck, evaluate machine size bump (`large-4x`) or model swap (`ggml-base.en`).
- Log regressions as follow-ups.
- `RUNBOOK.md` with common operations: record, reprocess a failed recording, inspect failed Trigger.dev runs, swap Whisper model, re-trigger a single stage.

**Verification**: All 5 questions land in the review UI with complete feedback. All progress bars behaved correctly. Any regressions are logged.

**Commit when**: Fresh recording processes end-to-end and `RUNBOOK.md` is committed.

---

## Phase 2 — Extensions

Goal: Textbook grounding, historical filtering, trend analysis, and multi-user support if needed.

### Task 11: Textbook upload and storage

**What**: Textbook upload flow — PDF/EPUB ingested, chunked, embedded, stored for retrieval. Surface an "uploaded textbooks" management page.

**Scope**:

- Upload UI (drag-and-drop PDFs/EPUBs) with upload progress bar.
- Parse to text, chunk semantically, embed with a current-gen embedding model.
- Store chunks + embeddings in Postgres (pgvector).
- Textbook management page (list, delete, re-index).
- Embedding runs as a Trigger.dev task with progress (chunks embedded / total).

**Verification**: Upload one Becker textbook PDF, confirm chunks appear in the DB with embeddings, and a search for a known phrase returns the expected chunk.

**Commit when**: Textbook uploads and embeds cleanly with visible progress.

### Task 12: Retrieval-grounded explanations

**What**: When grading produces "what you need to learn," retrieve relevant textbook chunks and include them in the explanation. Fall back to AI-generated explanation if no textbook is available.

**Scope**:

- Retrieval step in `gradeQuestion` (top-k chunks against question + gap).
- Update grading prompt to include retrieved context with citations.
- Render citations in the review UI (linking to chunk preview).
- Graceful fallback when no textbook is uploaded.

**Verification**: With one textbook uploaded, grading on a known-gap question produces an explanation that cites a relevant section. Without a textbook, the explanation still renders from AI knowledge.

**Commit when**: Grounded and ungrounded paths both produce readable explanations on the fixture.

### Task 13: Historical filtering

**What**: History page listing all past questions with filters for topic, section, score ranges, date, and textual search.

**Scope**:

- `/history` route with filterable list.
- Filters: section (AUD/BAR/FAR/REG/ISC/TCP), score ranges, date range, topic, free-text search on question/transcript.
- Each row links into the review UI.
- Server-side pagination.

**Verification**: With 30+ processed questions, each filter narrows the list correctly and search finds a known phrase.

**Commit when**: All filters work and pagination handles 100+ questions smoothly.

### Task 14: 100-question trend analysis

**What**: Generate a trend analysis after every 100 questions. Surfaces weak topics, recurring reasoning mistakes, consulting-technique trends, and focus areas for next sessions.

**Scope**:

- Trigger.dev task triggered when count hits a 100-question multiple.
- Aggregate stats (avg scores by section, frequent gap topics, consulting pattern clustering).
- LLM pass over aggregated data to produce a readable report.
- Dedicated `/trends/[n]` page rendering the report.
- Notification banner when a new trend report is available.

**Verification**: Seed 100 processed questions in a dev env, confirm a trend report is generated and renders with meaningful focus areas.

**Commit when**: Trend report generates and renders correctly on a 100-question seed.

### Task 15: Phase 2 end-to-end

**What**: Integration pass across textbook grounding, filtering, and trend analysis. Update `RUNBOOK.md`.

**Verification**: Upload textbook → record session → grade with citations → filter history → trigger trend analysis, all clean on a fresh dev env.

**Commit when**: Full Phase 2 flow runs clean and RUNBOOK is updated.

---

## Cross-cutting: Progress reporting contract

Every long-running stage in the pipeline MUST emit progress via Trigger.dev task metadata, conforming to this shape:

```ts
type StageProgress = {
  stage:   'segmenting' | 'extracting' | 'transcribing' | 'grading' | 'embedding' | 'analyzing_trends';
  pct:     number;          // 0–100
  etaSec?: number;          // optional estimated seconds remaining
  message: string;          // human-readable current step, e.g. "Transcribing clip 2 of 3"
  subProgress?: Record<string, number>; // optional breakdown, e.g. { ffmpeg: 80, whisper_prepass: 40 }
};
```

UI components subscribe via `useRealtimeRun` and bind progress bars directly to this shape. Never add a polling endpoint — realtime is the only path.

## Open Questions

- **Exact 10 feedback items**: The source doc lists 6 clearly; the other 4 are "additional stats." Must be locked before Task 7. Owner: user. Why parked: doesn't block Tasks 1–6.
- **CPA section weighting for combined score**: Which sections are "accounting-heavy" vs "consulting-heavy" and how should combined be weighted? Decide during Task 7. Owner: user. Why parked: grading prompt can be stubbed until this is known.
- **Whisper model tier**: Start on `small.en`. If accuracy or speed is off, swap to `base.en` (faster, less accurate) or `medium.en` (slower, more accurate). Decide during Task 10. Why parked: real-world recordings are the only fair test.
- **Trigger.dev machine size**: Start on `large-2x`. Bump to `large-4x` or larger if transcription is the bottleneck. Decide during Task 10.
- **Concurrency across questions**: Default fan-out is parallel per-clip (`extractQuestion` + `transcribeQuestion`). Revisit in Task 10 if machine CPU saturates.
- **Multi-user / auth**: MVP is single-user, no auth. Revisit in Phase 2 if the system needs to be shared.
- **Textbook formats beyond PDF/EPUB**: Phase 2 assumes PDF/EPUB. If Becker content is in other formats, add converters. Decide during Task 11.

## Glossary

- **Becker**: The CPA exam prep provider whose practice question UI is being recorded.
- **Consulting technique**: The verbal reasoning approach the user is graded on — how they talk through a problem, not just the final answer.
- **Section**: One of AUD, BAR, FAR, REG, ISC, TCP (CPA Evolution structure).
- **Question boundary**: The point in a recording where one practice question ends and the next begins — detected via visual cues (`ffmpeg` scene detection), perceptual-hash template matching (Becker UI states), and verbal cues ("next question") from the local Whisper pre-pass.
- **Trigger.dev**: Background job platform for TypeScript. Replaces BullMQ + Redis + a separate worker host. Tasks live in `/trigger`, deploy with `npx trigger.dev deploy`, run in containers we can extend with system dependencies (ffmpeg, whisper.cpp).
- **whisper.cpp**: C++ port of OpenAI's Whisper model. Runs on CPU, no API calls, word-level timestamps supported. Invoked from TypeScript via `smart-whisper` or `nodejs-whisper` npm bindings, or as a subprocess.
- **pHash**: Perceptual hash — a fingerprint of an image that's stable under small visual changes. Used here to classify keyframes as "Becker question view" vs "Becker feedback view" without a full ML model.
