# Resume State

status: CODE-READY-DEPLOY-CONFIG-PENDING
branch: codex/production-deployable
updated: 2026-05-12

## Current Truth

- Production auth is Google OAuth with `AUTH_ALLOWED_EMAILS=hotredsam@gmail.com`.
- Production AI routing uses OpenRouter through `OPENROUTER_API_KEY`.
- No provider-specific production AI key is required.
- Transcription uses local `whisper.cpp` in the Trigger.dev task container.
- Local Postgres remains `postgresql://postgres:postgres@localhost:5432/cpa_study`.
- Do not wipe, reseed, or reindex local/prod data unless the user explicitly asks.
- Keep `ENABLE_ADMIN_WIPE=false` in production.
- The codebase is production-deployable, but Vercel should not be deployed until
  `pnpm deploy:doctor:prod` passes with real production env vars loaded.
- The local study database has been reset for Sam to start studying: textbooks=1,
  chunks=33, topics=23, generated Anki cards=150, and recordings/questions/
  feedback/reviews/model-call logs/study routines=0.
- `node scripts/kill-dev-ports.mjs <port>` now accepts explicit ports; use it
  before production-bundle smoke tests on ports such as 3002 to avoid stale
  `.next` chunks.
- Latest agent-feedback fixes are in place: mobile bottom navigation fits all
  primary routes, Anki Audio controls stay reachable above the bottom nav,
  ratings are guarded until the answer is heard, `/record` blocks start/upload
  until DB/R2/Trigger/OpenRouter are healthy, upload errors show human messages,
  empty topic filters disable bulk AI refresh, and danger-zone reset copy now
  matches the preserve-library API behavior.
- Local `ModelConfig.CHAT_TUTOR` was corrected to OpenRouter model id
  `anthropic/claude-sonnet-4.6`.

## Verification Baseline

The current branch passed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (225/225)
- `pnpm prisma validate`
- `pnpm prisma migrate status`
- `pnpm build`
- production `next start` smoke on `http://localhost:3002` with `AUTH_BYPASS=true`
- `pnpm deploy:doctor` against `http://localhost:3002` (passed with expected local auth warnings)
- `pnpm e2e -- --project=chromium` (239/239)
- production `pnpm simulate:workflows` against `http://localhost:3002`
- production `pnpm runtime:probe` (300 depth-5 desktop sequences)
- production `pnpm runtime:probe:mobile` (300 depth-5 mobile sequences with overflow checks)
- `pnpm simulate:month` followed by `pnpm reset:study-progress`

The 30-day simulator uses direct local database writes only and does not call
OpenRouter, Trigger, R2 processing, or any other token-spending provider API.

## Deploy Next Steps

1. Confirm Vercel env vars match `DEPLOY.md`; `DATABASE_URL` must not be localhost.
2. Confirm Google OAuth callback uses the final Vercel domain.
3. Run `pnpm deploy:doctor:prod` with production env vars loaded and get zero failures.
4. Click Deploy in Vercel.
5. Sign in as `hotredsam@gmail.com` and run the smoke checklist in
   `docs/deploy-prod.md`.
