# Cloudflare R2 Setup Checklist

## Bucket settings

- [ ] Bucket name: `cpa-study-recordings`
- [ ] Region: Automatic (Cloudflare picks nearest)
- [ ] Public access: Disabled by default (uploads via presigned PUT URLs only)

## CORS configuration (required for browser uploads)

Apply via Cloudflare dashboard → R2 → your bucket → Settings → CORS:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3001",
      "https://<your-vercel-domain>.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-checksum-crc32"],
    "MaxAgeSeconds": 3000
  }
]
```

Without CORS, the browser PUT (upload) will fail with a CORS error.

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
curl http://localhost:3001/api/health
# Expected: {"db":"ok","r2":"ok","trigger":"ok","timestamp":"..."}
```

If R2 shows "unconfigured", one or more env vars are missing.
