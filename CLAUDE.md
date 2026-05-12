# CPA Study System - Agent Contract

This file is kept for older tooling that still opens `CLAUDE.md`. The current
source of truth is `AGENTS.md` plus `PLAN.md`; keep all three aligned.

## Stack (locked)

- TypeScript strict, no `any`, no `@ts-ignore`
- Node 22, pnpm (Node 24 is tolerated if pinned 22 is unavailable; see `BUILD_LOG.md`)
- Next.js App Router + Tailwind
- Prisma + Postgres
- Trigger.dev v3 for all long-running work
- Local `whisper.cpp` via smart-whisper; never use the OpenAI Whisper API
- OpenRouter for production AI routing; Codex/OAuth tooling is local dev assistance only
- Cloudflare R2 blobs
- ffmpeg local in the Trigger.dev task container
- Google OAuth single-user allowlist for `hotredsam@gmail.com`

## Commands

- `pnpm dev` - Next.js
- `pnpm test` - Vitest
- `pnpm typecheck` - `tsc --noEmit`
- `pnpm lint` - ESLint
- `pnpm e2e` - Playwright
- `pnpm prisma migrate dev` - local migrations
- `npx trigger.dev@latest dev` - Trigger.dev runner

## Conventions

- Named exports only, except Next.js page/layout/route files.
- Colocate tests with source (`foo.ts` -> `foo.test.ts`).
- Zod validation at every boundary.
- All long tasks emit the `StageProgress` shape through Trigger.dev metadata.
- Use realtime (`useRealtimeRun`), never polling.

## Do-nots

- No provider-specific production AI keys. Use OpenRouter.
- No OpenAI API calls.
- No polling endpoints.
- No hardcoded secrets. `.env` only; commit `.env.example` only.
- No default exports outside Next.js pages.
- No `any`, no `@ts-ignore`.
- Do not wipe, reseed, or reindex user data unless the user explicitly asks.
