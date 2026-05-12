# Resume State

status: PRODUCTION-DEPLOYABLE-CANDIDATE
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

## Verification Baseline

The production branch previously passed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm prisma validate`
- `pnpm prisma migrate status`
- `pnpm prisma migrate deploy`
- `pnpm build`
- `pnpm exec playwright test --project=chromium`
- `pnpm runtime:probe`
- `pnpm runtime:probe:mobile`

The latest security/docs pass reran the standard verification set successfully,
including desktop and mobile runtime probes.

## Deploy Next Steps

1. Push `main` and `codex/production-deployable`.
2. Confirm Vercel env vars match `DEPLOY.md`.
3. Confirm Google OAuth callback uses the final Vercel domain.
4. Click Deploy in Vercel.
5. Sign in as `hotredsam@gmail.com` and run the smoke checklist in
   `docs/deploy-prod.md`.
