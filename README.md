<div align="center">

# CPA Study Servant

**AI-powered CPA exam coach that watches you work, listens to you think, and grades both your answer and your reasoning.**

[![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-111827)](https://openai.com/codex)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Trigger.dev](https://img.shields.io/badge/Trigger.dev-v3-F45E2B)](https://trigger.dev)
[![whisper.cpp](https://img.shields.io/badge/whisper.cpp-local-5A67D8)](https://github.com/ggerganov/whisper.cpp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What it does

You record yourself working through Becker CPA practice questions. The app:

1. Captures your screen + your voice.
2. Splits the recording into one clip per question using ffmpeg scene detection, verbal cues from local Whisper, and perceptual-hash template matching against Becker's UI.
3. Transcribes your reasoning with `whisper.cpp` in the Trigger.dev task container, so audio is not sent to OpenAI Whisper or OpenRouter for transcription.
4. Extracts the question, choices, your answer, and Becker's explanation from keyframes using an OpenRouter-routed vision model.
5. Grades both your **accounting knowledge** (0–10) and your **verbal consulting technique** (0–10), then returns a 10-item structured feedback payload.
6. Tracks progress across sessions, surfaces weak topics every 100 questions, and grounds explanations in your uploaded textbooks (Phase 2).

## Architecture

``` mermaid
flowchart LR
    A[Record in-app<br/>MediaRecorder + getDisplayMedia] --> B[R2 upload<br/>presigned PUT]
    B --> C[Trigger.dev v3<br/>processRecording]
    C --> D[ffmpeg segmentation<br/>+ pHash UI templates<br/>+ Whisper pre-pass]
    D --> E1[OpenRouter vision<br/>question extraction]
    D --> E2[Local whisper.cpp<br/>transcription]
    E1 & E2 --> F[OpenRouter model<br/>grading + 10-item feedback]
    F --> G[Review UI<br/>live progress + playback]
```

## Stack

- Next.js (App Router) + Tailwind
- TypeScript strict, Node 22, pnpm
- Prisma + Postgres (Neon in prod, Docker locally)
- Trigger.dev v3 for all long-running work
- Cloudflare R2 for blobs
- `whisper.cpp` via `smart-whisper` for transcription (local, zero per-minute cost)
- OpenRouter for production AI routing; Codex OAuth is local dev tooling only
- `ffmpeg` for video work

## Development

``` bash
pnpm install
docker compose up -d postgres
pnpm prisma migrate dev
pnpm dev               # Next.js
npx trigger.dev@latest dev   # Trigger.dev
```

Local Postgres is expected at `postgresql://postgres:postgres@localhost:5432/cpa_study`.
Use the existing Docker volume by default; do not wipe or reseed unless you intend
to remove uploaded textbooks, topics, and generated cards.

Quick non-destructive health check:

``` bash
docker compose ps postgres
pnpm prisma migrate status
curl http://localhost:3000/api/health
```

If the app says the database is unavailable, start Docker Desktop, run
`docker compose up -d postgres`, wait for port `5432`, and refresh the page.

Navigation shortcuts are available anywhere outside text inputs. Press a sidebar
letter directly (`u` for Study, `y` for Topics, `t` for Settings) or use the
two-key `g` prefix (`g` then `u`, `g` then `y`, etc.). Tab bars support the
standard arrow-key, Home, and End behavior, plus `Alt+1` through `Alt+9`.

Topic mastery is computed from evidence, not a manually edited percentage. The
app blends graded accounting performance with reviewed Anki recall, applies
recency weighting, counts currently due cards, and infers Becker units from
chunk references such as `F1 M1`, `R1 M1`, and `S1 M1` for ISC.

Indexed Anki cards are coverage-based, not quota-based. The generator may create
zero cards for a chunk if it is introductory, repeated, or common-sense material,
and otherwise creates only enough cards to cover non-obvious exam rules,
exceptions, formulas, treatments, disclosures, and pitfalls.

Production auth is controlled by environment variables. Generate a session
secret before deploying:

``` bash
openssl rand -base64 33
# or: node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
```

Set `AUTH_REQUIRED=true`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, and `AUTH_ALLOWED_EMAILS=hotredsam@gmail.com` in Vercel.
Local dev can stay open unless `AUTH_REQUIRED=true` is present. Google OAuth
must use `/api/auth/callback/google` as the callback path.

Production security defaults:

- Only Google OAuth sessions for `AUTH_ALLOWED_EMAILS` can use the app.
- State-changing API requests require same-origin browser evidence and are rate-limited.
- OpenRouter calls are preflighted by hard spend gates: per-call estimate, daily cap, per-recording cap, and per-question cap. Context is recorded on `ModelCall` rows for auditability.
- First production deploy should keep conservative launch caps:
  `OPENROUTER_MAX_COST_PER_CALL_USD=0.15`,
  `OPENROUTER_DAILY_CAP_USD=3`,
  `OPENROUTER_RECORDING_CAP_USD=1.25`,
  `OPENROUTER_QUESTION_CAP_USD=0.25`, and
  `TRIGGER_ACTIVE_RECORDING_LIMIT=1`.
- OpenRouter keys are used only server-side. Prefer `OPENROUTER_API_KEY` in Vercel/Trigger env vars; if a key is saved in Settings, it is AES-GCM encrypted with `ENCRYPTION_KEY` and never returned to the browser.
- Keep `ENABLE_ADMIN_WIPE=false` in production unless you are deliberately performing maintenance.
- Do not create `NEXT_PUBLIC_*` variables for database, R2, Trigger, auth, or OpenRouter secrets.

Mobile support uses a bottom safe-area navigation layout and larger touch
targets. Because mobile Safari does not expose browser screen capture for other
apps, `/record` also accepts native iPhone screen-recording files (`.mov`,
`.mp4`, `.webm`) up to 2 GB and sends them through the same R2 upload and
Trigger pipeline. Recording and upload stay disabled until DB, R2, Trigger, and
OpenRouter key preflights are healthy, so large files do not upload into a known
pipeline failure.
The Anki Audio tab reads concept cards aloud with browser speech synthesis and
posts the same review ratings as regular flashcards. Rating buttons remain
disabled until the answer is heard, and completed audio reviews count toward
Anki progress.

Textbook upload is production-safe for Vercel: the browser uploads PDF textbooks
directly to Cloudflare R2 with a presigned PUT, then calls a small completion
route that verifies object size/type and queues indexing. EPUB/HTML upload is
not exposed until those converters are implemented.

For video storage, Cloudflare R2 remains the default deployable store. A NAS can
be used only if it is exposed to Vercel through a TLS-secured S3/MinIO or similar
gateway; configure the `PROCESSED_ARCHIVE_S3_*` variables once that endpoint
exists.

Runtime verification:

``` bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm e2e -- --project=chromium
pnpm simulate:workflows
pnpm runtime:probe
pnpm runtime:probe:mobile
pnpm deploy:doctor
```

`pnpm dev` and `pnpm build` clean only disposable Next.js build artifacts after
reclaiming ports 3000/3001. Playwright uses a separate `.next-e2e` dist folder
so E2E runs cannot corrupt the user-facing dev server on port 3000.
For other smoke-test ports, reclaim them explicitly, for example:

``` bash
node scripts/kill-dev-ports.mjs 3002
```

Before a Vercel deploy, also smoke the production bundle locally:

``` bash
node scripts/kill-dev-ports.mjs 3002
PORT=3002 AUTH_BYPASS=true ALLOW_LOCAL_PROD_AUTH_BYPASS=true pnpm start
DEPLOY_DOCTOR_BASE_URL=http://localhost:3002 pnpm deploy:doctor
WORKFLOW_SIM_BASE_URL=http://localhost:3002 pnpm simulate:workflows
RUNTIME_PROBE_BASE_URL=http://localhost:3002 pnpm runtime:probe
RUNTIME_PROBE_BASE_URL=http://localhost:3002 pnpm runtime:probe:mobile
```

In PowerShell, use `$env:NAME='value'; pnpm ...` or `Start-Process` instead of
the inline `NAME=value` syntax shown above.

Run `pnpm deploy:doctor:prod` only with real production environment variables
loaded. It must pass with zero failures before clicking Deploy in Vercel; it
intentionally fails when `DATABASE_URL` is localhost, Google OAuth is missing,
or required OpenRouter/R2/Trigger/auth secrets are absent.

The runtime probes explore non-destructive click and keyboard sequences to depth
5, reject framework crash text, raw Prisma errors, missing `_document.js`/ENOENT
output, 404 crash pages, and mobile horizontal overflow.

`pnpm simulate:workflows` is the higher-level real-user rehearsal. It seeds
temporary local-only recordings, mocks upload/provider endpoints, and exercises
login setup, dashboard shortcuts, study reader, topics, Anki practice/audio,
browser recording, iPhone upload, pipeline/review, library, settings, sessions,
analytics, and mobile primary flows without calling OpenRouter, Trigger.dev, R2,
or any token-spending provider.

## Sam's input folder

Drop voice memos into `sam-input/audio/` or edit `sam-input/TODO.xml` and save. A hook transcribes the audio with local Whisper and calls Codex to act on whatever you dictated. See `sam-input/README.md` for the schema.

## Status

Infrastructure is production-deployable after production env vars pass `pnpm deploy:doctor:prod`. See `BUILD_LOG.md`, `RESUME_STATE.md`, and `PLAN.md` for current verification and remaining pipeline caveats.
