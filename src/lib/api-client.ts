/**
 * Typed API client for CPA Study App.
 * All functions throw on non-2xx responses with an {error: {code, message}} shape.
 * Claude Design team: import from this module — do NOT call fetch() directly.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

const ApiErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parseResponse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new ApiClientError("PARSE_ERROR", `Non-JSON response: ${text.slice(0, 200)}`); }

  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    if (err.success) {
      throw new ApiClientError(err.data.error.code, err.data.error.message, err.data.error.details, res.status);
    }
    throw new ApiClientError("HTTP_ERROR", `HTTP ${res.status}`, json, res.status);
  }

  return schema.parse(json);
}

// ---------------------------------------------------------------------------
// Response schemas (Zod)
// ---------------------------------------------------------------------------

const CreateRecordingResponse = z.object({
  recordingId: z.string(),
  uploadUrl: z.string().url(),
  r2Key: z.string(),
  expiresInSec: z.number(),
});

const CompleteRecordingResponse = z.object({
  recording: z.object({
    id: z.string(),
    status: z.string(),
    triggerRunId: z.string().nullable(),
  }),
  runId: z.string(),
  publicAccessToken: z.string(),
});

const ReviewStateResponse = z.object({
  questionId: z.string(),
  quality: z.number(),
  efactor: z.number(),
  interval: z.number(),
  repetitions: z.number(),
  nextReviewAt: z.string(),
});

const ReviewNextResponse = z.object({
  items: z.array(
    z.object({
      questionId: z.string(),
      efactor: z.number(),
      interval: z.number(),
      repetitions: z.number(),
      nextReviewAt: z.string(),
      isNew: z.boolean(),
      question: z.object({
        id: z.string(),
        section: z.string().nullable(),
        startSec: z.number(),
        endSec: z.number(),
        status: z.string(),
        extracted: z.unknown().nullable(),
        feedback: z.object({ combinedScore: z.number() }).nullable(),
      }),
    }),
  ),
  totalDue: z.number(),
  totalNew: z.number(),
});

// ---------------------------------------------------------------------------
// Client functions
// ---------------------------------------------------------------------------

const BASE = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001");

/**
 * Create a new Recording and get a presigned R2 upload URL.
 *
 * @example
 * const { recordingId, uploadUrl } = await createRecording({ contentType: "video/webm" });
 * await fetch(uploadUrl, { method: "PUT", body: file, headers: { "content-type": "video/webm" } });
 */
export async function createRecording(body: { contentType?: string; durationSec?: number }) {
  const res = await fetch(`${BASE}/api/recordings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res, CreateRecordingResponse);
}

/**
 * Signal that the R2 upload is done and trigger the pipeline.
 *
 * @example
 * const { runId, publicAccessToken } = await completeRecording(recordingId);
 * // Use publicAccessToken with useRealtimeRun(runId, { accessToken: publicAccessToken })
 */
export async function completeRecording(recordingId: string) {
  const res = await fetch(`${BASE}/api/recordings/${recordingId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  return parseResponse(res, CompleteRecordingResponse);
}

/**
 * Get questions due for review, ordered by overdue-ness then newness.
 *
 * @example
 * const { items, totalDue, totalNew } = await listDueReviews({ n: 10 });
 * for (const item of items) { ... }
 */
export async function listDueReviews(opts: { n?: number } = {}) {
  const params = opts.n ? `?n=${opts.n}` : "";
  const res = await fetch(`${BASE}/api/review/next${params}`);
  return parseResponse(res, ReviewNextResponse);
}

/**
 * Grade a question with SM-2 quality score (0–5).
 * Updates the question's ReviewState and returns the new scheduling info.
 *
 * @example
 * const state = await gradeQuestion(questionId, 4);
 * console.log(`Next review: ${state.nextReviewAt} (${state.interval} days)`);
 */
export async function gradeQuestion(questionId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  const res = await fetch(`${BASE}/api/review/${questionId}/grade`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quality }),
  });
  return parseResponse(res, ReviewStateResponse);
}

/**
 * Download an Anki .apkg file for a recording.
 * Returns the raw Response so the caller can stream it or trigger a browser download.
 *
 * @example
 * const res = await exportToAnki(recordingId);
 * const blob = await res.blob();
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement("a"); a.href = url; a.download = "cpa.apkg"; a.click();
 */
export async function exportToAnki(recordingId: string): Promise<Response> {
  const res = await fetch(`${BASE}/api/sessions/${recordingId}/export`);
  if (!res.ok) {
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    const err = ApiErrorBody.safeParse(json);
    if (err.success) {
      throw new ApiClientError(err.data.error.code, err.data.error.message, err.data.error.details, res.status);
    }
    throw new ApiClientError("HTTP_ERROR", `HTTP ${res.status}`, json, res.status);
  }
  return res;
}
