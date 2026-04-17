import type { Transcript } from "./schemas/transcript";

// Minimal smart-whisper integration surface. smart-whisper expects 16kHz mono
// float32 PCM, so callers must decode their WAV to Float32Array first (e.g.
// via `wavefile` or ffmpeg + a raw f32le stream). The actual dynamic import
// is deferred so test environments that don't ship the native binary still
// load this module cleanly.

export type WhisperOptions = {
  pcm: Float32Array;
  modelPath: string;
  language?: string;
};

export async function transcribeWithWhisper(opts: WhisperOptions): Promise<Transcript> {
  const { Whisper } = await import("smart-whisper");
  const whisper = new Whisper(opts.modelPath);
  try {
    const task = await whisper.transcribe(opts.pcm, {
      language: opts.language ?? "en",
      token_timestamps: true,
    } as unknown as Record<string, unknown>);
    const result = (await task.result) as unknown as RawSegment[];
    return normalizeResult(result);
  } finally {
    await whisper.free?.();
  }
}

type RawWord = { start: number; end: number; text?: string; word?: string };
type RawSegment = { start: number; end: number; text: string; tokens?: RawWord[] };

export function normalizeResult(segments: RawSegment[], language = "en"): Transcript {
  return {
    language,
    segments: segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      words: (s.tokens ?? []).map((w) => ({
        start: w.start,
        end: w.end,
        word: (w.text ?? w.word ?? "").trim(),
      })),
    })),
  };
}
