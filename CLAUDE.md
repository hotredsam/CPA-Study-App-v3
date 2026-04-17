# CPA Study System — Build Contract

Source of truth: `PLAN.md`. Read it before every task.

## Stack (locked)
- TypeScript strict, no `any`, no `@ts-ignore`
- Node 22, pnpm (Node 24 is tolerated if pinned 22 is unavailable — see BUILD_LOG.md Section 2)
- Next.js (App Router) + Tailwind
- Prisma + Postgres
- Trigger.dev v3 — all long-running work
- Local whisper.cpp via smart-whisper — NEVER OpenAI Whisper API
- Claude Sonnet 4.6 via OAuth for dev, Anthropic API for prod
- Cloudflare R2 blobs
- ffmpeg local in Trigger.dev task container

## Commands
- `pnpm dev` — Next.js
- `pnpm test` — Vitest
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — eslint
- `pnpm e2e` — Playwright
- `pnpm prisma migrate dev` — migrate
- `npx trigger.dev@latest dev` — Trigger.dev runner

## Conventions
- Named exports only (except Next.js page/layout/route files).
- Colocate tests with source (`foo.ts` → `foo.test.ts`).
- Zod validation at every boundary.
- All long tasks emit the `StageProgress` shape via Trigger.dev metadata.
- Use realtime (`useRealtimeRun`), never polling.

## Do-nots
- No OpenAI API calls.
- No polling endpoints.
- No hardcoded secrets. `.env` only. Commit `.env.example` only.
- No default exports outside Next.js pages.
- No `any`, no `@ts-ignore`.

## Workflow
- One PLAN.md task per session; `/clear` between tasks.
- Enter Plan Mode before coding.
- End each task with its Verification block. Commit only on pass.
- Delegate heavy work to subagents in `.claude/agents/`.
