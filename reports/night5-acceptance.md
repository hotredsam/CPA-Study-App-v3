# Night 5 Acceptance Report
Generated: 2026-04-19

## Summary
Night 5 shipped the complete UI redesign (10 screens migrated from prototype) and 7 new AI features,
wired through a new OpenRouter LLM routing layer with caching, batching, and budget enforcement.

## Verification Results
- Unit + Integration tests: 170 passed / 0 failed
- E2E tests (Playwright): 15 passed / 0 failed
- TypeScript: 0 errors
- ESLint: 0 warnings, 0 errors

## Per-Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Segmentation (ffmpeg) | Done (Existing) | Uses local ffmpeg, 4 bugs fixed in Night 4 |
| Question Extraction | Done (Existing) | Via claude-cli (OAuth), routed through runFunction |
| Transcription (Whisper) | Done (Existing) | smart-whisper local, no model on Windows dev |
| Pipeline Tagging | Done (Shipped) | tagQuestion.ts, between transcribe+grade stages |
| Grading | Done (Existing) | FeedbackItem keys still provisional (blocker 2026-04-17-feedback-items) |
| Topic Extraction | Done (Shipped) | runTopicExtract, batch=on, wired into textbook-indexer |
| Checkpoint Quiz | Done (Shipped) | runCheckpointQuiz, GET /api/study/checkpoint |
| Anki Card Gen | Done (Shipped) | runAnkiGen, batch=on, wired into textbook-indexer |
| Chat Tutor | Done (Shipped) | runChatTutor, POST /api/chat (non-streaming stub — SSE TODO) |
| Voice Note | Done (Shipped) | runVoiceNote, local whisper, POST /api/anki/:id/voice-note |
| Topic AI Notes | Done (Shipped) | runTopicNotes, single + bulk endpoints |

## Per-Screen Status

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Dashboard | / | Full | Stats aggregated from DB, today's schedule, weakest topics |
| Record | /record | Full | 3-phase (preflight/cockpit/upload), real AnalyserNode waveform |
| Pipeline | /pipeline | Full | 6-stage stepper, live refetch, previous tab |
| Review Home | /review | Full | Session list, avg score computed |
| Review Detail | /review/[recordingId] | Full | QuestionSelector, split/stacked, AI chat |
| Topics | /topics | Full | Filter/sort/search, expandable detail, AI notes refresh |
| Study Home | /study | Full | Resume hero, textbook picker |
| Study Reader | /study/[id]/[chunkId] | Full | Prose + checkpoint quiz, chunk nav |
| Anki | /anki | Full | Daily/Practice/Path/Browse sub-views, SM-2 rating |
| Library | /library | Full | Drag-drop upload, status badges, re-index |
| Textbook Viewer | /library/[id] | Full | TOC + prose + chunk pagination |
| Settings | /settings | Full | 5 tabs: study/models/appearance/indexing/danger |

## Stubbed / Provisional Behaviors

1. **Chat tutor SSE streaming** — currently returns JSON response; SSE requires ReadableStream upgrade. TODO comment at `src/app/api/chat/route.ts`.
2. **Whisper transcription** — smart-whisper requires a model binary not present on Windows dev. Works in Trigger.dev container.
3. **@xenova/transformers** — type stub only; install `pnpm add @xenova/transformers` in container. Local embeddings marked `precision: "provisional"`.
4. **OpenRouter key** — placeholder UserSettings row; gate in router.ts falls back to OAuth claude-cli. See blocker `night5-openrouter-key` in TODO.xml.
5. **Feedback item keys** — still provisional (blocker `2026-04-17-feedback-items`).
6. **AnkiBrowse sub-view** — `TODO(fidelity)` stub, not implemented in prototype either.
7. **Budget singleton** — requires `pnpm db:seed` to create the Budget row. E2e logs warn if missing.
8. **Mermaid flowchart** — FlowchartCard in Review is described in prototype but not yet rendered (needs `mermaid` package).
9. **Study routine blocks** — Dashboard shows today's schedule; routine must be saved via Settings → Study tab first.

## Route Coverage

All 12 routes compile and load. Dynamic routes tested with smoke Playwright tests. Full data-wiring tested via API + unit tests.

## Infrastructure

| System | Status |
|--------|--------|
| OpenRouter LLM router | Complete — caching, batching, auto-degrade, budget |
| Semantic cache | Complete — CF Workers AI or local xenova, cosine similarity |
| Batch coalesce | Complete — Trigger.dev cron every 15min |
| Budget ledger | Complete — monthly cap, warn threshold, hard stop, auto-degrade |
| Per-function model config | Complete — 11 functions configurable via Settings |
| Theme system | Complete — 5 themes (paper/night/sepia/sakura/scientific) |
| Keyboard nav | Complete — g+letter chords, ? help overlay TODO |

## Fidelity Delta (vs Prototype)

See `// TODO(fidelity):` comments in source for per-item tracking.

Primary visual drift items (non-blocking):
1. Icon system — using Unicode/minimal SVG vs. prototype's custom icon library
2. Cockpit waveform — implemented with real AnalyserNode but bar count/style may differ slightly
3. FlowchartCard — not rendered (requires mermaid package)
4. QuestionSelector colored squares — implemented but may need fine-tuning
5. TweaksPanel bottom of sidebar — present but may be collapsed by default
