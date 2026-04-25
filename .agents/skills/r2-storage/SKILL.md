---
name: r2-storage
description: Cloudflare R2 patterns — presigned PUT/GET, multipart upload with progress, blob key naming conventions, lifecycle rules. Use for Task 2 (upload) and anywhere the app touches R2.
---

# Cloudflare R2

S3-compatible. We use the AWS SDK v3 pointed at the R2 endpoint. No R2-specific client.

## Client factory

```ts
import { S3Client } from "@aws-sdk/client-s3";

export function r2Client() {
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
  } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error("R2 env missing");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}
```

## Blob key conventions

```
recordings/<recordingId>/raw.webm          # full uploaded session
recordings/<recordingId>/audio.wav         # pre-pass Whisper audio (16kHz mono)

clips/<questionId>/clip.webm               # one clip per question
clips/<questionId>/audio.wav               # per-clip audio for Task 6
clips/<questionId>/thumbnail.jpg           # first keyframe
clips/<questionId>/question-frames/*.jpg   # question-view keyframes for Task 5
clips/<questionId>/feedback-frames/*.jpg   # feedback-view keyframes for Task 5
```

**Never** use timestamps in keys — use IDs. IDs are cuids from Prisma.

## Presigned PUT (Task 2 upload)

```ts
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function presignUpload(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client(), cmd, { expiresIn: 900 }); // 15 min
}
```

Client-side: `fetch(url, { method: "PUT", body: blob })` with `XMLHttpRequest.upload.onprogress` for the progress bar (fetch doesn't expose upload progress). Task 2 uses the XHR pattern.

## Multipart upload (files >100 MB)

Use `@aws-sdk/lib-storage` `Upload`:

```ts
import { Upload } from "@aws-sdk/lib-storage";

const upload = new Upload({
  client: r2Client(),
  params: { Bucket, Key, Body, ContentType },
  partSize: 10 * 1024 * 1024, // 10 MiB
  queueSize: 4,
});
upload.on("httpUploadProgress", (p) => onProgress(p.loaded! / p.total!));
await upload.done();
```

Server-side only — browsers use presigned PUT.

## Presigned GET (task reads)

```ts
import { GetObjectCommand } from "@aws-sdk/client-s3";
export async function presignGet(key: string) {
  return getSignedUrl(r2Client(), new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 3600 });
}
```

## Lifecycle / retention

- `recordings/*` — keep 30 days then lifecycle-delete raw.webm. Per-question clips stay longer.
- `clips/*` — keep indefinitely until the user deletes the `Question` row (cascading delete on `Question.delete` wipes the folder).
- Keyframes + thumbnails — keep indefinitely; they're tiny.

Configure via Cloudflare dashboard or `PutBucketLifecycleConfiguration`. Leave as a manual step in Phase 1.

## Public URLs

Use R2's public-access bucket configuration (`R2_PUBLIC_URL` env) for thumbnails only — never expose raw recordings or clips publicly.
