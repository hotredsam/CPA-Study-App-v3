# Night 6 Refactor Inventory

**Date:** 2026-04-19

## Files > 400 lines (split candidates)

| File | Lines | Split plan |
|------|-------|------------|
| src/app/record/RecordClient.tsx | 981 | Extract AudioControls, PermissionsPrompt, UploadProgress |
| src/app/review/[recordingId]/ReviewClient.tsx | 611 | Extract QuestionNav, TranscriptPanel, FeedbackPanel |
| src/app/settings/tabs/ModelsTab.tsx | 541 | Extract ModelRow, BudgetMeter components |
| src/app/DashboardClient.tsx | 496 | Extract StatsRail, SectionMastery, WeakTopicsCard |
| src/app/library/LibraryClient.tsx | 475 | Extract RecordingRow, SearchBar |
| src/app/study/[textbookId]/[chunkId]/StudyReaderClient.tsx | 432 | Extract ChunkNav, AnkiPanel |
| src/lib/api-client.ts | 415 | Extract by domain (recordings, topics, anki) |
| src/app/pipeline/PipelineClient.tsx | 415 | Extract StageTimeline, QuestionList |

**Immediate priority:** RecordClient.tsx (981 lines, highest risk).  
**Deferred:** Remaining 7 — functional, no correctness issues.

## console.log occurrences

- `src/lib/api-client.ts:160` — commented-out debug log (remove)

No active `console.log` calls in production code paths.

## Commented-out code

No significant commented-out code blocks. Most `//` comments are intent notes.

## Stale TODOs

| File | Comment | Category |
|------|---------|----------|
| src/types/xenova.d.ts:2 | install @xenova/transformers | infra (low priority) |
| src/components/shell/KeyboardNav.tsx:49 | ? key shortcut overlay | fidelity P2 |
| src/lib/cache/prompt-cache.ts:1 | OpenRouter prompt cache not exposed yet | external blocker |
| src/app/api/chat/route.ts:20 | upgrade to SSE | fidelity P1 |
| src/app/review/[recordingId]/ReviewClient.tsx:458 | SSE streaming for chat | fidelity P0 |
| src/app/review/[recordingId]/ReviewClient.tsx:568,577 | FlowchartCard (mermaid) | fidelity P0 |
| src/app/settings/tabs/StudyTab.tsx:298 | per-line XML error list | fidelity P1 |
| src/app/anki/AnkiBrowse.tsx:1 | full Browse view | fidelity P1 |
| src/app/anki/AnkiDaily.tsx:38 | /api/anki/stats endpoint | fidelity P1 |
| src/app/api/topics/[id]/history/route.ts:5 | real question history | fidelity P2 |

## Duplicate helpers

None found. Utility functions are properly centralised in `src/lib/`.

## Folder layout

Clean. All trigger tasks in `src/trigger/`, API routes in `src/app/api/`, components in `src/components/`.

## Actions taken (E2–E7)

- [x] E4: Remove commented-out `console.log` in api-client.ts
- [ ] E7: Split RecordClient.tsx (981 lines) — deferred, functional risk too high without tests
- [ ] Depcheck/ts-prune: run after E2–E6 to verify no regressions
