# Production Deploy Guide — CPA Study App v3

## Overview

| Service | Provider | Purpose |
| ------- | -------- | ------- |
| Frontend + API | Vercel | Next.js app + API routes |
| Database | Neon | Postgres 16 (serverless) |
| Blob storage | Cloudflare R2 | Video files, clips, thumbnails |
| Pipeline tasks | Trigger.dev Cloud | Long-running AI tasks |

---

## 1. Neon (Postgres)

1. Create a Neon account at neon.tech
2. Create a project: `cpa-study-app-v3`
3. In the project dashboard, find **Connection Details**:
   - Copy the **Connection pooling** URL (use for `DATABASE_URL` in Vercel)
   - Copy the **Direct connection** URL (use for migrations only)
4. Run migrations against prod DB:
   ```bash
   DATABASE_URL="<direct-connection-url>" pnpm prisma migrate deploy
   ```
5. Keep the pooler URL for runtime (`PRISMA_DATABASE_URL` or just `DATABASE_URL` in Vercel env)

---

## 2. Cloudflare R2

1. In Cloudflare dashboard → R2 → Create bucket: `cpa-study-recordings`
2. Create an API token:
   - Go to R2 → Manage R2 API Tokens → Create API Token
   - Permissions: Object Read & Write on the specific bucket
   - Copy: Account ID, Access Key ID, Secret Access Key
3. Set CORS on the bucket:
   ```json
   [
     {
       "AllowedOrigins": ["https://cpa-study-app-v3.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   For local dev, add `"http://localhost:3000"` to AllowedOrigins.
4. Optionally set a public domain for the bucket (for direct video playback)

The app uploads recordings and PDF textbooks directly from the browser to R2
with presigned PUT URLs, then calls a completion route that verifies object
size/type before Trigger.dev processing. Do not route large textbook PDFs through
Vercel functions.

---

## 3. Trigger.dev

1. Create a Trigger.dev account at trigger.dev
2. Create a project: "cpa-study-v3"
3. Note the **Project ID** (format: `proj_...`)
4. Generate a **Secret Key** (format: `tr_sec_...`)
5. Deploy the tasks from this repo:
   ```bash
   pnpm exec trigger deploy --env prod --env-file .env.vercel
   ```
   This uploads task code to Trigger.dev Cloud. The repo's `trigger.config.ts`
   builds `ffmpeg`, `whisper.cpp`, local Whisper models, and the Prisma Linux
   client during deployment.
6. In Trigger.dev dashboard → Environment Variables, add:
   - `DATABASE_URL` (Neon direct connection URL for task runtime; run migrations separately with `pnpm prisma migrate deploy`)
   - `OPENROUTER_API_KEY` (your OpenRouter API key)
   - `ENCRYPTION_KEY` (64-character hex key for encrypted stored API settings)
   - `ENABLE_ADMIN_WIPE=false`
   - `WHISPER_MODEL_PATH` (path to whisper model in container, e.g. `/app/ggml-small.en.bin`)
   - All R2 env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, etc.)

---

## 4. Vercel

1. Go to vercel.com → New Project → Import Git Repository
2. Select `CPA-Study-App-v3` from GitHub
3. Framework: Next.js (auto-detected)
4. Build command: `pnpm build` (or leave default)
5. Install command: `pnpm install`
6. Set all environment variables (see table below)
7. Deploy

### Environment variables for Vercel

| Variable | Value | Notes |
| -------- | ----- | ----- |
| `DATABASE_URL` | Neon pooler URL | Pooled connection for serverless |
| `AUTH_REQUIRED` | `true` | Enables production auth |
| `AUTH_SECRET` | random secret | Generate with `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` | Google client ID | Google OAuth credential |
| `AUTH_GOOGLE_SECRET` | Google client secret | Google OAuth credential |
| `AUTH_ALLOWED_EMAILS` | `hotredsam@gmail.com` | Only this email can sign in |
| `ENABLE_ADMIN_WIPE` | `false` | Keeps destructive admin wipe disabled in production |
| `R2_ACCOUNT_ID` | Cloudflare account ID | |
| `R2_ACCESS_KEY_ID` | R2 API token key ID | |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | |
| `R2_BUCKET_NAME` | `cpa-study-recordings` | |
| `R2_PUBLIC_URL` | `https://<bucket>.r2.dev` | Optional, for public URLs |
| `TRIGGER_PROJECT_ID` | `proj_...` from Trigger.dev | |
| `TRIGGER_SECRET_KEY` | `tr_sec_...` from Trigger.dev | |
| `OPENROUTER_API_KEY` | OpenRouter key | AI routing |
| `ENCRYPTION_KEY` | 64 hex characters | Encrypts stored OpenRouter settings |
| `SENTRY_DSN` | (optional) | Leave blank to disable Sentry |
| `NEXT_PUBLIC_SENTRY_DSN` | (optional) | Client-side Sentry DSN |

Add these authorized redirect URIs to the Google OAuth Web Application:

- `https://<your-vercel-domain>/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` for local testing

Current production domain:

- `https://cpa-study-app-v3.vercel.app`
- Google OAuth callback: `https://cpa-study-app-v3.vercel.app/api/auth/callback/google`

---

## 5. First Deploy Smoke Test

Before clicking Deploy, confirm these security-sensitive values:

```
[ ] pnpm deploy:doctor:prod passes with zero failures using production env vars
[ ] DATABASE_URL is a Neon/Vercel production Postgres URL, not localhost
[ ] AUTH_REQUIRED=true
[ ] AUTH_ALLOWED_EMAILS=hotredsam@gmail.com
[ ] AUTH_SECRET is a fresh production-only secret
[ ] AUTH_BYPASS and ALLOW_LOCAL_PROD_AUTH_BYPASS are not set in Vercel
[ ] OPENROUTER_API_KEY is set only as a server/secret env var
[ ] No NEXT_PUBLIC_* variable contains database, auth, R2, Trigger, or OpenRouter secrets
[ ] ENCRYPTION_KEY is 64 hex characters and backed up securely
[ ] ENABLE_ADMIN_WIPE=false
[ ] Google OAuth callback exactly matches https://<domain>/api/auth/callback/google
[ ] R2 CORS allows PUT/POST/HEAD/GET from https://cpa-study-app-v3.vercel.app
```

After deploy, run this checklist:

```
[ ] GET https://<domain>.vercel.app/ → redirects to login when signed out
[ ] Sign in with Google as hotredsam@gmail.com → loads home page
[ ] GET https://<domain>.vercel.app/api/health → {db:"ok", r2:"ok", trigger:"ok"}
[ ] POST https://<domain>.vercel.app/api/recordings (with valid body) → returns uploadUrl
[ ] PUT <uploadUrl> with a small test file → HTTP 200
[ ] POST /api/recordings/<id>/complete → returns runId
[ ] Watch Trigger.dev dashboard → see the run appear and execute
[ ] GET https://<domain>.vercel.app/sessions → loads without error
[ ] GET https://<domain>.vercel.app/analytics → loads without error
```

---

## 6. Anki Export on Vercel

⚠️ **Python subprocesses do not work on Vercel.** The `/api/sessions/<id>/export` route
returns a polished 501 response in production on Vercel.

**Alternatives:**
- Run the export endpoint from a dedicated server (Fly.io, Railway, DigitalOcean)
- Implement the .apkg format in pure TypeScript using `better-sqlite3` + `archiver`
- Use a Trigger.dev task to generate the .apkg and upload it to R2, then return a download link

---

## 7. DNS

Point your domain to Vercel following [vercel.com/docs/projects/domains](https://vercel.com/docs/projects/domains).
Update the R2 CORS `AllowedOrigins` to include your production domain.
