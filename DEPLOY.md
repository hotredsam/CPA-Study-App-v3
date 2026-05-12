# Deployment Guide

## Prerequisites

- Node.js 22+ (`node --version`)
- pnpm (`npm i -g pnpm`)
- PostgreSQL 15+ (Neon in prod, Docker in dev)
- Cloudflare R2 bucket with CORS configured
- Trigger.dev account + project
- **Python 3.9+ with `genanki`** — required for Anki `.apkg` export:
  ```bash
  pip install genanki
  ```
  On Vercel (serverless), Python subprocesses are not available. The `/api/sessions/[id]/export`
  route will return 500 in that environment. For production Anki export, consider:
  - Running a small VPS/Container that serves this endpoint
  - Or a separate Trigger.dev task that generates the .apkg and uploads it to R2

---

## Local Development

```bash
# 1. Copy env template and fill in values
cp .env.example .env

# 2. Start Postgres + any local services
docker compose up -d

# 3. Apply migrations and generate Prisma client
pnpm prisma migrate dev

# 4. Install dependencies
pnpm install

# 5. Run Next.js dev server (terminal 1)
pnpm dev

# 6. Run Trigger.dev worker (terminal 2)
npx trigger.dev@latest dev
```

The app will be available at http://localhost:3000.
The Trigger.dev dashboard will show your worker connected.

---

## Production Deployment

### 1. Provision Neon Postgres

1. Create a new project at https://neon.tech
2. Copy the connection string (pooled endpoint recommended for serverless)
3. Set `DATABASE_URL` to the pooled connection string
4. Run migrations against prod: `DATABASE_URL=<neon-url> pnpm prisma migrate deploy`

### 2. Cloudflare R2

R2 is already production-capable. Configure the bucket:

1. In the Cloudflare dashboard, open your bucket → Settings → CORS
2. Add a CORS rule allowing your Vercel domain:
   ```json
   [
     {
       "AllowedOrigins": ["https://your-app.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. Optionally enable a public domain under bucket → Public access for `R2_PUBLIC_URL`

### 3. Trigger.dev Worker

```bash
# Deploy tasks to Trigger.dev cloud
npx trigger.dev@latest deploy
```

In the Trigger.dev dashboard (https://cloud.trigger.dev), set these environment variables for your project:
- `DATABASE_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `OPENROUTER_API_KEY`
- `ENCRYPTION_KEY`
- `WHISPER_MODEL_PATH` (path to model file in the task container, if using custom image)

### 4. Vercel

```bash
# Deploy to Vercel
vercel --prod
```

Set these environment variables in the Vercel project dashboard (Settings → Environment Variables):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_REQUIRED` | Set to `true` in production |
| `AUTH_SECRET` | Session secret, generated with `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_ALLOWED_EMAILS` | `hotredsam@gmail.com` |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public bucket URL (optional) |
| `TRIGGER_PROJECT_ID` | Trigger.dev project ID |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `ENCRYPTION_KEY` | 64-character hex key for stored OpenRouter settings |

In Google Cloud Console, the OAuth Web Application must include:

- `https://<your-vercel-domain>/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` for local testing

---

## Environment Variables Reference

| Name | Required in Prod | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://...`) |
| `AUTH_REQUIRED` | Yes | Set to `true` in production |
| `AUTH_SECRET` | Yes | Session secret |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `AUTH_ALLOWED_EMAILS` | Yes | Comma-separated allowlist; use `hotredsam@gmail.com` |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID (found in R2 dashboard) |
| `R2_ACCESS_KEY_ID` | Yes | R2 API token — Key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API token — Secret |
| `R2_BUCKET_NAME` | Yes | Name of the R2 bucket |
| `R2_PUBLIC_URL` | No | Public HTTPS URL for the bucket (enables direct links) |
| `TRIGGER_PROJECT_ID` | Yes | Trigger.dev project reference ID |
| `TRIGGER_SECRET_KEY` | Yes | Trigger.dev secret key for triggering tasks |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `ENCRYPTION_KEY` | Yes | 64-character hex key for encrypted stored API settings |
| `WHISPER_MODEL_PATH` | No | Absolute path to whisper.cpp model file in the task container |
| `NODE_ENV` | Auto-set | Set by Vercel/Node; do not set manually |

---

## Troubleshooting

### App crashes immediately at startup — "Invalid environment variables"

`src/lib/env.ts` validates all required env vars at module load time.
The console will print which variables are missing or malformed.
Check that all required variables listed above are set in Vercel / your `.env`.

### `DATABASE_URL` is rejected

The URL must be a valid PostgreSQL connection string starting with `postgresql://` or `postgres://`.
Neon provides both formats; use the pooled (`?sslmode=require`) version for Vercel serverless.

### Prisma migration fails in CI/CD

Run `pnpm prisma migrate deploy` (not `migrate dev`) against the production database before deploying the app.
`migrate dev` is for local development only.

### Trigger.dev tasks never start

1. Confirm `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_ID` match the Trigger.dev dashboard.
2. Run `npx trigger.dev@latest deploy` to ensure the latest task code is deployed.
3. Check the Trigger.dev dashboard → Runs for error details.

### R2 uploads fail with CORS error

Add the exact Vercel deployment URL (not a wildcard) to the bucket CORS policy.
Vercel preview URLs follow the pattern `https://<git-hash>-<project>.vercel.app` — add your production domain.

### Whisper transcription not running

Set `WHISPER_MODEL_PATH` to the absolute path of the `.bin` model file accessible inside the Trigger.dev task container.
If using the default Trigger.dev cloud runner, you need a custom Docker image that includes the model file.
