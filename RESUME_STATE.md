# Resume State

status: READY-FOR-STUDY-AND-DEPLOY
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
- The local study database has been reset for Sam to start studying: textbooks=1,
  chunks=33, topics=23, generated Anki cards=150, and recordings/questions/
  feedback/reviews/model-call logs/study routines=0.

## Verification Baseline

The current branch passed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (222/222)
- `pnpm prisma validate`
- `pnpm prisma migrate status`
- `pnpm build`
- production `next start` smoke: `/api/health` 200, unauthenticated `/` redirects to `/login?setup=missing`
- production desktop/mobile product-flow smoke with `AUTH_BYPASS=true`
- `pnpm e2e -- --project=chromium` (237/237)
- production `pnpm runtime:probe` (900 depth-5 desktop sequences)
- production `pnpm runtime:probe:mobile` (900 depth-5 mobile sequences with overflow checks)
- `pnpm simulate:month` followed by `pnpm reset:study-progress`

The 30-day simulator uses direct local database writes only and does not call
OpenRouter, Trigger, R2 processing, or any other token-spending provider API.

## Deploy Next Steps

1. Confirm Vercel env vars match `DEPLOY.md`.
2. Confirm Google OAuth callback uses the final Vercel domain.
3. Click Deploy in Vercel.
4. Sign in as `hotredsam@gmail.com` and run the smoke checklist in
   `docs/deploy-prod.md`.
