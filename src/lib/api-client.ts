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

const RecordingListItem = z.object({
  id: z.string(),
  status: z.string(),
  durationSec: z.number().nullable(),
  createdAt: z.string(),
  _count: z.object({ questions: z.number() }),
});

const RecordingListResponse = z.object({
  items: z.array(RecordingListItem),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

/**
 * List recordings with cursor pagination.
 *
 * @example
 * const page1 = await listRecordings({ limit: 20 });
 * const page2 = await listRecordings({ cursor: page1.nextCursor, limit: 20 });
 */
export async function listRecordings(opts: { cursor?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await fetch(`${BASE}/api/recordings?${params}`);
  return parseResponse(res, RecordingListResponse);
}

/**
 * Permanently delete a recording and all its clips from R2 and the database.
 *
 * @example
 * await deleteRecording(recordingId); // returns undefined on success (204)
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/recordings/${recordingId}`, { method: "DELETE" });
  if (res.status === 204) return;
  throw await parseErrorResponse(res);
}

/**
 * Re-queue a recording for pipeline reprocessing.
 * Wipes existing questions, feedback, and stage progress before re-triggering.
 *
 * @example
 * const { runId } = await reprocessRecording(recordingId);
 */
export async function reprocessRecording(recordingId: string) {
  const res = await fetch(`${BASE}/api/recordings/${recordingId}/reprocess`, { method: "POST" });
  return parseResponse(res, z.object({ recordingId: z.string(), runId: z.string() }));
}

const SessionListItem = z.object({
  id: z.string(),
  status: z.string(),
  durationSec: z.number().nullable(),
  createdAt: z.string(),
  questionCount: z.number(),
  avgScore: z.number().nullable(),
});

const SessionListResponse = z.object({
  items: z.array(SessionListItem),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  total: z.number(),
});

/**
 * List sessions with optional text search, status filter, and pagination.
 *
 * @example
 * const results = await listSessions({ q: "revenue recognition", status: "done" });
 */
export async function listSessions(opts: {
  q?: string;
  status?: string;
  cursor?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.status) params.set("status", opts.status);
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await fetch(`${BASE}/api/sessions?${params}`);
  return parseResponse(res, SessionListResponse);
}

async function parseErrorResponse(res: Response): Promise<ApiClientError> {
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  const err = ApiErrorBody.safeParse(json);
  if (err.success) {
    return new ApiClientError(err.data.error.code, err.data.error.message, err.data.error.details, res.status);
  }
  return new ApiClientError("HTTP_ERROR", `HTTP ${res.status}`, json, res.status);
}

// ---------------------------------------------------------------------------
// New AI feature endpoints (Night 5 / Phase E)
// ---------------------------------------------------------------------------

const CheckpointQuizResponse = z.object({
  questions: z.array(
    z.object({
      stem: z.string(),
      choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
      correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      rationale: z.string(),
      distractorQualityNote: z.string(),
    }),
  ),
});

/**
 * Get checkpoint quiz questions for a textbook chunk.
 *
 * @example
 * const { questions } = await getCheckpointQuiz(chunkId);
 */
export async function getCheckpointQuiz(chunkId: string) {
  const res = await fetch(`${BASE}/api/study/checkpoint?chunkId=${encodeURIComponent(chunkId)}`);
  return parseResponse(res, CheckpointQuizResponse);
}

const RegenerateAnkiCardsResponse = z.object({
  count: z.number(),
  topicId: z.string(),
});

/**
 * Regenerate Anki cards for all chunks belonging to a topic.
 *
 * @example
 * const { count } = await regenerateAnkiCards(topicId);
 */
export async function regenerateAnkiCards(topicId: string) {
  const res = await fetch(
    `${BASE}/api/anki/regenerate?topicId=${encodeURIComponent(topicId)}`,
  );
  return parseResponse(res, RegenerateAnkiCardsResponse);
}

const RefreshTopicNotesResponse = z.object({
  topicId: z.string(),
  aiNotes: z.object({
    coreRule: z.string(),
    pitfall: z.string(),
    citation: z.string(),
    performance: z.string(),
  }),
});

/**
 * Refresh AI-generated study notes for a single topic.
 *
 * @example
 * const { aiNotes } = await refreshTopicNotes(topicId);
 */
export async function refreshTopicNotes(topicId: string) {
  const res = await fetch(`${BASE}/api/topics/${topicId}/refresh-notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  return parseResponse(res, RefreshTopicNotesResponse);
}

const BulkRefreshTopicNotesResponse = z.object({
  processed: z.number(),
});

/**
 * Bulk-refresh AI study notes for topics matching a section or explicit list.
 *
 * @example
 * const { processed } = await bulkRefreshTopicNotes({ section: "FAR" });
 * const { processed } = await bulkRefreshTopicNotes({ topicIds: ["id1", "id2"] });
 */
export async function bulkRefreshTopicNotes(params: {
  section?: string;
  topicIds?: string[];
}) {
  const res = await fetch(`${BASE}/api/topics/bulk-refresh-notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseResponse(res, BulkRefreshTopicNotesResponse);
}

const PostChatResponse = z.object({
  reply: z.string(),
  conversationId: z.string(),
});

/**
 * Send a message to the CPA tutor chatbot.
 * Creates a new conversation if no conversationId is provided.
 *
 * @example
 * const { reply, conversationId } = await postChat({ message: "Explain ASC 606" });
 * // Continue the conversation:
 * const { reply: reply2 } = await postChat({ conversationId, message: "Give me an example" });
 */
export async function postChat(body: {
  conversationId?: string;
  message: string;
  context?: { recordingId?: string; questionId?: string; topicId?: string };
}) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res, PostChatResponse);
}
