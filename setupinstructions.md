# Setup Instructions - Current Truth

This file replaces the older long setup notes. For the detailed source of truth,
use:

- `README.md` for local development
- `RUNBOOK.md` for operations and troubleshooting
- `DEPLOY.md` and `docs/deploy-prod.md` for Vercel deployment
- `AGENTS.md` and `PLAN.md` for build rules

## Local Development

```bash
pnpm install
docker compose up -d postgres
pnpm prisma migrate deploy
pnpm dev
```

Local database URL:

```text
postgresql://postgres:postgres@localhost:5432/cpa_study
```

Do not wipe, reseed, or reindex the local Docker volume unless the user
explicitly wants to replace uploaded textbooks, topics, cards, settings, and
routines.

## Production Runtime

Production uses:

- Vercel for the Next.js app and API routes
- Neon or Vercel Postgres for `DATABASE_URL`
- Cloudflare R2 for recording and derived media blobs
- Trigger.dev Cloud for long-running pipeline tasks
- OpenRouter for AI routing
- Local `whisper.cpp` inside the Trigger.dev task container for transcription
- Google OAuth with `AUTH_ALLOWED_EMAILS=hotredsam@gmail.com`

Production uses Google sign-in, not an in-app credential form, and it uses
OpenRouter rather than provider-specific production keys. OpenRouter model IDs
may include provider prefixes such as `anthropic/...`; the API key is still
`OPENROUTER_API_KEY`.

## Required Production Env Vars

Set these in Vercel and the matching backend/task service when applicable:

```text
DATABASE_URL=<production postgres url, never localhost>
AUTH_REQUIRED=true
AUTH_SECRET=<fresh random base64 secret>
AUTH_GOOGLE_ID=<google oauth client id>
AUTH_GOOGLE_SECRET=<google oauth client secret>
AUTH_ALLOWED_EMAILS=hotredsam@gmail.com
ENABLE_ADMIN_WIPE=false
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 key id>
R2_SECRET_ACCESS_KEY=<r2 secret>
R2_BUCKET_NAME=cpa-study-recordings
TRIGGER_PROJECT_ID=<trigger project id>
TRIGGER_SECRET_KEY=<trigger secret key>
OPENROUTER_API_KEY=<openrouter key>
ENCRYPTION_KEY=<64 hex characters>
```

Optional:

```text
R2_PUBLIC_URL=<public bucket/domain url>
SENTRY_DSN=<server sentry dsn>
NEXT_PUBLIC_SENTRY_DSN=<client sentry dsn only>
WHISPER_MODEL_PATH=<task-container path to ggml model>
WHISPER_PREPASS_MODEL_PATH=<optional faster prepass model>
```

Never put database, auth, R2, Trigger, or OpenRouter secrets in `NEXT_PUBLIC_*`
variables.

## Google OAuth

Create a Google OAuth Web Application and add:

```text
https://<your-domain>/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

Only `hotredsam@gmail.com` can sign in unless `AUTH_ALLOWED_EMAILS` is expanded.

## Pre-Deploy Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm prisma validate
pnpm prisma migrate status
pnpm build
pnpm e2e -- --project=chromium
```

For deeper local interaction coverage:

```bash
pnpm runtime:probe
pnpm runtime:probe:mobile
```

## Security Defaults

- State-changing API requests require a signed Google session, same-origin
  browser evidence, and per-IP rate limits.
- OpenRouter keys are server-side only. The Settings page only returns
  `{ hasKey: boolean }`; saved keys are encrypted with `ENCRYPTION_KEY`.
- `ENABLE_ADMIN_WIPE` must stay `false` in production.
- Rotate `OPENROUTER_API_KEY`, `AUTH_SECRET`, R2 credentials, and
  `TRIGGER_SECRET_KEY` immediately if any secret might have leaked.
