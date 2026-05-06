# RUNBOOK — CPA Study App

Operational reference. Fast answers first, detail below.

## Quickstart (fresh machine)

```bash
pnpm install
docker compose up -d          # postgres
pnpm prisma migrate deploy
pnpm dev                      # http://localhost:3000
pnpm trigger:dev              # Trigger.dev dev runner (separate terminal)
```

Required env vars (see `.env.example`):

- `DATABASE_URL` — local: `postgresql://postgres:postgres@localhost:5432/cpa_study`
- `R2_*` — Cloudflare R2 credentials (endpoint, access key, secret, bucket)
- `TRIGGER_SECRET_KEY` — Trigger.dev secret (dev scope)
- `ANTHROPIC_API_KEY` — for Tasks 5 + 7 once wired

## Record a session

1. Go to `/record`.
2. Pick a mic (Default is fine) and click **Start recording**.
3. Browser asks for a screen/window/tab — pick the Becker tab.
4. Work through questions normally; narrate your reasoning.
5. Click **Stop** or close the shared tab.
6. Watch the upload progress bar fill; on completion you're routed to `/recordings/<id>/status`.

## Watch the pipeline

- **Live**: `/recordings/<id>/status` — every stage, every pct, every sub-row.
- **Trigger.dev dashboard**: run logs, retries, errors with stack traces.
- **Prisma Studio**: `pnpm prisma studio` → `Recording`, `Question`, `Feedback`, `StageProgress`.

## Review graded questions

- `/review/<questionId>` — question, choices, user vs correct answer, Becker
  explanation, transcript with clickable word timestamps, 10 feedback items.
- Prev/next: on-screen buttons OR `←` / `→` keys.

## Reprocess a failed recording

The pipeline is idempotent per stage. Two ways to retry:

1. **From the Trigger.dev dashboard**: open the failed run, click **Replay**.
2. **From a DB record**: POST again to `/api/recordings/<id>/complete`. The
   route triggers `processRecording`, which upserts `Question`/`Feedback`.

## Re-trigger a single stage

`processRecording` is the orchestrator. To re-run a single child task:

- Open the Trigger.dev run in the dashboard, pick the child run you want
  (e.g. the `transcribeQuestion` run for `questionId=X`), and Replay it.
- The metadata pipes back into `/recordings/<id>/status` automatically.

## Swap the Whisper model

Default: `ggml-small.en.bin`. If accuracy lags:

- Edit the Trigger.dev build extension to download `ggml-medium.en.bin` instead.
- Redeploy the Trigger.dev tasks (`pnpm trigger deploy`).
- Monitor Task 6 runtime on a known fixture; if >15× realtime, bump the
  machine size (`large-2x` → `large-4x`) before going back to `small.en`.

## Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/record` shows "permission denied" | OS denied screen-capture | Grant Chrome permission in OS settings |
| Upload stalls at 0% | R2 presigned URL expired (15 min) | Re-click Start — a fresh URL is minted |
| Status page shows amber "no runId" | Trigger.dev secret missing | Set `TRIGGER_SECRET_KEY`, restart `pnpm dev` |
| `segmentRecording` emits the stub marker | Task 4 not yet live | Expected until fixture boundaries are locked — see `sam-input/TODO.xml` |
| `gradeQuestion` writes empty items | Task 7 not yet live | Same — blocked on 10-item key lock |
| Word-timestamps missing | `ggml-small.en` w/o `token_timestamps` | Enabled by default in `src/lib/whisper.ts`; verify `smart-whisper` version |
| Runtime error mentions `.next\server\pages\_document.js` or missing route files | Two Next dev/build processes shared a stale `.next` directory | Stop dev servers with `pnpm kill-ports`, then run `pnpm dev`. E2E uses isolated `.next-e2e`; do not manually run two `next dev` processes against the same dist dir. |

## Tests

- `pnpm test` — vitest (unit + integration)
- `pnpm e2e` — playwright (boots `pnpm dev`, runs chromium)
- `pnpm typecheck` — tsc --noEmit
- `pnpm lint` — next lint
- `pnpm build` - clean production build
- `pnpm runtime:probe` - real-browser interaction crawler. It explores
  non-destructive visible click targets and representative keyboard actions to
  depth 5, and fails on HTTP 500s, page errors, raw Prisma text, `_document.js`,
  `ENOENT`, or framework crash overlays.

## Local database recovery

The local Docker volume is the source of truth for uploaded textbooks, topics,
cards, settings, and routines. Do not run wipe or seed commands unless data loss
is intended.

```bash
docker compose up -d postgres
pnpm prisma migrate deploy
pnpm prisma migrate status
```

Confirm the app can see preserved data without mutating it:

```bash
pnpm exec tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); console.log(await p.textbook.count(), await p.topic.count(), await p.ankiCard.count()); await p.$disconnect();"
```

If the UI shows "Database offline" or an API returns `DATABASE_UNAVAILABLE`,
Docker Desktop is usually closed or Postgres is not listening on `localhost:5432`.
Start Docker Desktop, run the compose command above, then refresh the page.

## Where to look when something is weird

- **Pipeline state in the DB**: `StageProgress` rows track the last snapshot
  per recording/stage — useful for post-hoc debugging when a run is gone.
- **Realtime public token**: minted server-side in
  `src/app/recordings/[id]/status/page.tsx`, read-only scope for the run.
- **Progress plumbing**: `src/trigger/progress.ts` throttles writes to 1Hz.
- **Schemas**: `src/lib/schemas/*` are authoritative. The UI tolerates stub
  shapes today; once a schema's `.parse()` replaces `.safeParse()` in the
  renderer, remove the tolerances.

## Open blockers (see `sam-input/TODO.xml`)

- `2026-04-17-fixture-boundaries` — need human-validated question boundaries on
  the four sample recordings so Tasks 4 + 5 can be verified end-to-end.
- 10-item feedback keys — must be locked before Task 7 grading goes live.
