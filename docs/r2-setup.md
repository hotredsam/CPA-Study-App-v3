# Cloudflare R2 Setup Checklist

## Bucket settings

- [ ] Bucket name: `cpa-study-recordings`
- [ ] Region: Automatic (Cloudflare picks nearest)
- [ ] Public access: Disabled by default (uploads via presigned PUT URLs only)
- [ ] CORS configured for production browser uploads

## CORS configuration (required for browser uploads)

Apply via Cloudflare dashboard → R2 → your bucket → Settings → CORS:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://cpa-study-app-v3.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without CORS, the browser PUT (upload) will fail with a CORS error.
The object read/write R2 S3 keys used by the app are intentionally not
bucket-admin keys and cannot update CORS. Change CORS in the Cloudflare
dashboard, or use a separate short-lived Cloudflare admin token only for setup.

## API token scopes

When creating the R2 API token:
- **Object Read** on `cpa-study-recordings`
- **Object Write** on `cpa-study-recordings`
- Do NOT grant account-level admin permissions

## Lifecycle rules (recommended)

| Rule | Target | TTL |
| ---- | ------ | --- |
| Delete partial multipart uploads | `recordings/` prefix | 7 days |
| (Optional) Delete raw recordings | `recordings/*/raw.*` | 30 days after processing |

Raw recordings are large (30–500 MB each). Once segmented into clips, the raw file can be deleted.
The app stores clips + thumbnails permanently. Add a lifecycle rule to purge raws after 30 days.

## Env vars needed

```
R2_ACCOUNT_ID=<24-char hex account ID from Cloudflare dashboard URL>
R2_ACCESS_KEY_ID=<from R2 API token>
R2_SECRET_ACCESS_KEY=<from R2 API token>
R2_BUCKET_NAME=cpa-study-recordings
R2_PUBLIC_URL=https://<bucket>.r2.dev  # optional — only if public domain is configured
```

## Verifying setup

After setting `.env`:
```bash
curl http://localhost:3000/api/health
# Expected: {"db":"ok","r2":"ok","trigger":"ok","timestamp":"..."}
```

If R2 shows "unconfigured", one or more env vars are missing.
