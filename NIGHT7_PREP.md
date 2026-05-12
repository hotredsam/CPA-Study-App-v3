# Superseded Prep Notes

This historical checklist has been replaced by the current production-readiness
instructions in `README.md`, `RUNBOOK.md`, `DEPLOY.md`, and `docs/deploy-prod.md`.

Current decisions:

- Production auth is Google OAuth only.
- The default allowlist is `hotredsam@gmail.com`.
- Production AI routing uses OpenRouter via `OPENROUTER_API_KEY`.
- No provider-specific production AI key is required.
- Transcription uses local `whisper.cpp` in the Trigger.dev task container.
- Do not wipe, reseed, or reindex data unless the user explicitly asks.
- Keep `ENABLE_ADMIN_WIPE=false` in production.

Use this verification set before deploying:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm prisma validate
pnpm prisma migrate status
pnpm build
pnpm e2e -- --project=chromium
```
