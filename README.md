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
4. Extracts the question, choices, your answer, and Becker's explanation from keyframes using Claude vision.
5. Grades both your **accounting knowledge** (0–10) and your **verbal consulting technique** (0–10), then returns a 10-item structured feedback payload.
6. Tracks progress across sessions, surfaces weak topics every 100 questions, and grounds explanations in your uploaded textbooks (Phase 2).

## Architecture

``` mermaid
flowchart LR
    A[Record in-app<br/>MediaRecorder + getDisplayMedia] --> B[R2 upload<br/>presigned PUT]
    B --> C[Trigger.dev v3<br/>processRecording]
    C --> D[ffmpeg segmentation<br/>+ pHash UI templates<br/>+ Whisper pre-pass]
    D --> E1[Claude vision<br/>question extraction]
    D --> E2[Local whisper.cpp<br/>transcription]
    E1 & E2 --> F[Claude Sonnet 4.6<br/>grading + 10-item feedback]
    F --> G[Review UI<br/>live progress + playback]
```

## Stack

- Next.js (App Router) + Tailwind
- TypeScript strict, Node 22, pnpm
- Prisma + Postgres (Neon in prod, Docker locally)
- Trigger.dev v3 for all long-running work
- Cloudflare R2 for blobs
- `whisper.cpp` via `smart-whisper` for transcription (local, zero per-minute cost)
- Claude Sonnet 4.6 via OAuth-authenticated Claude Code during dev; Anthropic API in prod
- `ffmpeg` for video work

## Development

``` bash
pnpm install
docker compose up -d postgres
pnpm prisma migrate dev
pnpm dev               # Next.js
npx trigger.dev@latest dev   # Trigger.dev
```

## Sam's input folder

Drop voice memos into `sam-input/audio/` or edit `sam-input/TODO.xml` and save. A hook transcribes the audio with local Whisper and calls Claude Code to act on whatever you dictated — overnight or while you're at work. See `sam-input/README.md` for the schema.

## Status

Phase 1 MVP under autonomous build. See `BUILD_LOG.md` for the overnight build report, and `PLAN.md` for the full task breakdown.
