<div align="center">

# CPA Study Servant

**AI-powered CPA exam coach that watches you work, listens to you think, and grades both your answer and your reasoning.**

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-8A2BE2)](https://code.claude.com)
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
3. Transcribes your reasoning locally with `whisper.cpp` — **your audio never leaves your machine**.
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
standard arrow-key, Home, and End behavior.

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

Mobile support uses a bottom safe-area navigation layout and larger touch
targets. Because mobile Safari does not expose browser screen capture for other
apps, `/record` also accepts native iPhone screen-recording files (`.mov`,
`.mp4`, `.webm`) and sends them through the same R2 upload and Trigger pipeline.
The Anki Audio tab reads concept cards aloud with browser speech synthesis and
posts the same review ratings as regular flashcards, so completed audio reviews
count toward Anki progress.

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
pnpm runtime:probe
```

`pnpm dev` and `pnpm build` clean only disposable Next.js build artifacts after
reclaiming ports 3000/3001. Playwright uses a separate `.next-e2e` dist folder
so E2E runs cannot corrupt the user-facing dev server on port 3000.

## Sam's input folder

Drop voice memos into `sam-input/audio/` or edit `sam-input/TODO.xml` and save. A hook transcribes the audio with local Whisper and calls Claude Code to act on whatever you dictated — overnight or while you're at work. See `sam-input/README.md` for the schema.

## Status

Phase 1 MVP under autonomous build. See `BUILD_LOG.md` for the overnight build report, and `PLAN.md` for the full task breakdown.
