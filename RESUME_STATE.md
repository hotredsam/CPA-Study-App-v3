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
- `pnpm test` (213/213)
- `pnpm prisma validate`
- `pnpm prisma migrate status`
- `pnpm build`
- `pnpm e2e -- --project=chromium` (235/235)
- `pnpm runtime:probe` (900 depth-5 desktop sequences)
- `pnpm runtime:probe:mobile` (900 depth-5 mobile sequences)
- `pnpm simulate:month` followed by `pnpm reset:study-progress`

The 30-day simulator uses direct local database writes only and does not call
OpenRouter, Trigger, R2 processing, or any other token-spending provider API.

## Deploy Next Steps

1. Confirm Vercel env vars match `DEPLOY.md`.
2. Confirm Google OAuth callback uses the final Vercel domain.
3. Click Deploy in Vercel.
4. Sign in as `hotredsam@gmail.com` and run the smoke checklist in
   `docs/deploy-prod.md`.
