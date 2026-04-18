# CPA Study App — API Reference

**Base URL:** `http://localhost:3001` (dev) / `https://<your-vercel-domain>.vercel.app` (prod)

**Auth:** None (single-user MVP). Future: Bearer token in `Authorization` header.

**Error envelope** (all error responses):
```json
{ "error": { "code": "BAD_REQUEST|NOT_FOUND|UNPROCESSABLE|INTERNAL_ERROR", "message": "...", "details": {} } }
```

---

## Recordings

### `POST /api/recordings`

Create a new Recording row and return a presigned R2 upload URL.

**Request body** (`application/json`):
```ts
{
  contentType?: string;   // default "video/webm"
  durationSec?: number;   // positive integer, max 14400 (4 h)
}
```

**Response `200`** (`application/json`):
```ts
{
  recordingId: string;     // cuid
  uploadUrl: string;       // presigned R2 PUT URL, expires in 15 min
  r2Key: string;           // e.g. "recordings/<id>/raw.webm"
  expiresInSec: number;    // 900
}
```

**Errors:** `400` — invalid body (durationSec must be positive integer, not null)

**Rate limit:** 10 per 5-minute window per IP (Phase F target; not yet enforced)

---

### `POST /api/recordings/:id/complete`

Signal that the upload finished. Triggers the Trigger.dev `processRecording` pipeline.

**Request body:** empty `{}` or omitted

**Response `200`** (`application/json`):
```ts
{
  recording: Recording;     // full Prisma Recording row
  runId: string;            // Trigger.dev run ID
  publicAccessToken: string; // use with useRealtimeRun on the client
}
```

**Errors:** `404` — recording not found

**Note:** The file content is not validated at this layer. ffmpeg validates it during `segmentRecording`.

---

## Review / Spaced Repetition

### `GET /api/review/next`

Return the next N questions due for review (oldest-overdue first, then new cards).

**Query params:**
```
n  — integer 1–100, default 10
```

**Response `200`** (`application/json`):
```ts
{
  items: Array<{
    questionId: string;
    efactor: number;
    interval: number;
    repetitions: number;
    nextReviewAt: string; // ISO datetime
    isNew: boolean;
    question: {
      id: string;
      section: CpaSection | null;
      startSec: number;
      endSec: number;
      status: QuestionStatus;
      extracted: ExtractedQuestion | null;
      feedback: { combinedScore: number } | null;
    };
  }>;
  totalDue: number;
  totalNew: number;
}
```

**Errors:** `400` — invalid n

---

### `POST /api/review/:questionId/grade`

Grade a question using SM-2 algorithm. Creates or updates the `ReviewState` for this question.

**Request body** (`application/json`):
```ts
{
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  // 5=perfect, 4=hesitation, 3=difficult, 2=failed-felt-easy, 1=failed-remembered, 0=blackout
}
```

**Response `200`** (`application/json`):
```ts
{
  questionId: string;
  quality: number;
  efactor: number;
  interval: number;      // days until next review
  repetitions: number;
  nextReviewAt: string;  // ISO datetime
}
```

**Errors:** `400` — invalid quality (must be 0–5 integer), `404` — question not found

**Example:**
```ts
// Grade a question as "perfect response" (quality 5)
const res = await fetch(`/api/review/${questionId}/grade`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ quality: 5 }),
});
```

---

## Sessions / Export

### `GET /api/sessions/:recordingId/export`

Stream an Anki `.apkg` file containing one flashcard per graded Question in the recording.

- Front: question text + choices
- Back: correct answer + Becker explanation + top-3 lowest-scoring feedback items
- GUIDs are stable (hash of questionId) — re-exporting updates existing cards

**Response `200`**:
- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="cpa-<id>.apkg"`
- Binary body: valid `.apkg` (ZIP with `collection.anki2` SQLite inside)

**Errors:**
- `404` — recording not found
- `422` — no graded questions in this recording
- `500` — Python `genanki` subprocess failed (ensure `pip install genanki` is run)

**Note:** Requires Python 3.9+ and `genanki` installed on the server. Not available on Vercel
serverless. See `DEPLOY.md` for alternatives.

---

## Internal / Health

### `GET /api/trigger/hello`

Test route that triggers a Trigger.dev hello-world task. Used for dev smoke testing.

---

## Data types reference

```ts
// From src/lib/schemas/extracted.ts
type ExtractedQuestion = {
  question: string;
  choices: Array<{ label: string; text: string }>;
  userAnswer: string | null;
  correctAnswer: string | null;
  beckerExplanation: string | null;
  section: CpaSection | null;
  _precision?: "provisional";
}

// CPA sections (post-Evolution 2024)
type CpaSection = "AUD" | "BAR" | "FAR" | "REG" | "ISC" | "TCP" | "BEC"

// From src/lib/schemas/feedback.ts
type FeedbackItem = {
  key: string;
  axis: "accounting" | "consulting";
  score: number;      // 0–10
  comment?: string;
  precision?: "provisional";
}
```
