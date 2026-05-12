export const MAX_TEXTBOOK_UPLOAD_BYTES = 250 * 1024 * 1024;
export const MAX_RECORDING_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_VOICE_NOTE_BYTES = 25 * 1024 * 1024;

const PDF_MIME_TYPES = new Set(["application/pdf"]);
const VIDEO_MIME_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
]);
const AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
]);

function normalized(value: string | null | undefined): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAllowedPdfUpload(args: {
  fileName?: string | null;
  contentType?: string | null;
}): boolean {
  const type = normalized(args.contentType);
  const name = args.fileName?.trim().toLowerCase() ?? "";
  return PDF_MIME_TYPES.has(type) || name.endsWith(".pdf");
}

export function isAllowedRecordingUpload(args: {
  fileName?: string | null;
  contentType?: string | null;
}): boolean {
  const type = normalized(args.contentType);
  const name = args.fileName?.trim().toLowerCase() ?? "";
  return (
    VIDEO_MIME_TYPES.has(type) ||
    name.endsWith(".webm") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".m4v")
  );
}

export function isAllowedVoiceNoteUpload(args: {
  fileName?: string | null;
  contentType?: string | null;
}): boolean {
  const type = normalized(args.contentType);
  const name = args.fileName?.trim().toLowerCase() ?? "";
  return (
    AUDIO_MIME_TYPES.has(type) ||
    name.endsWith(".webm") ||
    name.endsWith(".m4a") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".aac")
  );
}

export function normalizedContentType(value: string | null | undefined, fallback: string): string {
  return normalized(value) || fallback;
}
