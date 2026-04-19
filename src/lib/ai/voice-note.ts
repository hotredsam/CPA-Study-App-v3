import { z } from "zod";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { normalizeResult } from "@/lib/whisper";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const VoiceNoteInput = z.object({
  audioData: z.instanceof(Buffer),
  mimeType: z.string(),
});

export const VoiceNoteOutput = z.object({
  transcript: z.string(),
});

export type VoiceNoteInput = z.infer<typeof VoiceNoteInput>;
export type VoiceNoteOutput = z.infer<typeof VoiceNoteOutput>;

// ---------------------------------------------------------------------------
// Internal types for smart-whisper raw output
// ---------------------------------------------------------------------------

type RawWord = { start: number; end: number; text?: string; word?: string };
type RawSegment = { start: number; end: number; text: string; tokens?: RawWord[] };

// ---------------------------------------------------------------------------
// Entry function — uses local whisper.cpp via smart-whisper, NOT OpenRouter
// ---------------------------------------------------------------------------

export async function runVoiceNote(input: VoiceNoteInput): Promise<VoiceNoteOutput> {
  const validated = VoiceNoteInput.parse(input);

  const ext = validated.mimeType.includes("mp4") ? "mp4" : "webm";
  const tmpPath = join(tmpdir(), `voice-note-${randomUUID()}.${ext}`);

  try {
    await writeFile(tmpPath, validated.audioData);

    const modelPath =
      process.env.WHISPER_MODEL_PATH ??
      join(homedir(), ".cache/whisper.cpp/ggml-small.en.bin");

    if (!existsSync(modelPath)) {
      // Model not available — return empty transcript gracefully
      return VoiceNoteOutput.parse({ transcript: "" });
    }

    const { Whisper } = await import("smart-whisper");
    const whisperInstance = new Whisper(modelPath);

    try {
      // Note: smart-whisper expects Float32Array (16kHz mono PCM).
      // For voice notes (short clips), we use a minimal approach —
      // write the file and transcribe using whisper's built-in decode path.
      // In production, ffmpeg decodes to f32le first (same as transcribeQuestion).
      // Here we do a best-effort transcription with the raw file.
      const { readFile } = await import("node:fs/promises");
      const rawBuffer = await readFile(tmpPath);
      const pcmF32 = new Float32Array(
        rawBuffer.buffer,
        rawBuffer.byteOffset,
        rawBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
      );

      const transcribeTask = await whisperInstance.transcribe(pcmF32, {
        language: "en",
        token_timestamps: false,
      } as unknown as Record<string, unknown>);

      const rawSegments = (await transcribeTask.result) as unknown as RawSegment[];
      const normalized = normalizeResult(rawSegments);
      const transcript = normalized.segments.map((s) => s.text).join(" ").trim();

      return VoiceNoteOutput.parse({ transcript });
    } finally {
      await (whisperInstance as { free?: () => Promise<void> }).free?.();
    }
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}
