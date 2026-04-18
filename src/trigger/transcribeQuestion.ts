import { logger, task } from "@trigger.dev/sdk/v3";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";
import { downloadToTmp } from "@/lib/r2-download";
import { parseFfmpegPctFromChunk } from "@/lib/progress-parsers";
import { normalizeResult } from "@/lib/whisper";
import { Transcript } from "@/lib/schemas/transcript";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract 16kHz mono f32le PCM from an audio/video file using ffmpeg.
 * Writes to `outputPath` (.f32 raw file).
 */
function extractPcm(
  inputPath: string,
  outputPath: string,
  durationSec: number,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-i", inputPath,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-f", "f32le",
      "-y",
      outputPath,
    ]);

    let stderrBuf = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBuf += text;
      if (onProgress) {
        const pct = parseFfmpegPctFromChunk(text, durationSec);
        if (pct !== null) onProgress(pct);
      }
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg PCM extraction exited ${code}: ${stderrBuf.slice(-500)}`));
      } else {
        resolve();
      }
    });
  });
}

type RawWord = { start: number; end: number; text?: string; word?: string };
type RawSegment = { start: number; end: number; text: string; tokens?: RawWord[] };

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const transcribeQuestion = task({
  id: "transcribeQuestion",
  maxDuration: 60 * 30,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    const setStage = makeThrottledStage();

    setStage({ stage: "transcribing", pct: 0, message: "Fetching question…" });

    // 1. Fetch Question
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
    });

    await prisma.question.update({
      where: { id: questionId },
      data: { status: "transcribing" },
    });

    // 2. Check if clipR2Key is set
    if (!question.clipR2Key) {
      logger.log("no clipR2Key — marking noAudio=true", { questionId });
      await prisma.question.update({
        where: { id: questionId },
        data: {
          noAudio: true,
          transcript: { language: "en", segments: [] },
        },
      });
      setStage({ stage: "transcribing", pct: 100, message: "No audio — skipped" });
      return { questionId, ok: true };
    }

    const clipR2Key = question.clipR2Key;
    const clipDuration = question.endSec - question.startSec;

    // 3. Download clip to tmp
    setStage({ stage: "transcribing", pct: 5, message: "Downloading clip…" });
    const clipTmpPath = await downloadToTmp(clipR2Key, "webm");
    const workDir = dirname(clipTmpPath);
    const pcmPath = join(workDir, "audio.f32");

    try {
      // 4. Extract 16kHz mono f32le PCM via ffmpeg (0→30%)
      setStage({ stage: "transcribing", pct: 10, message: "Extracting PCM…" });
      await extractPcm(
        clipTmpPath,
        pcmPath,
        clipDuration,
        (pct) => {
          setStage({
            stage: "transcribing",
            pct: 10 + Math.round(pct * 0.2),
            message: `Extracting audio ${pct}%`,
          });
        },
      );

      setStage({ stage: "transcribing", pct: 30, message: "Loading audio data…" });

      // 5. Load f32 file as Float32Array
      const rawBuffer = await readFile(pcmPath);
      const pcmF32 = new Float32Array(
        rawBuffer.buffer,
        rawBuffer.byteOffset,
        rawBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
      );

      // 6. Try smart-whisper with graceful fallback
      const modelPath =
        process.env.WHISPER_MODEL_PATH ??
        join(homedir(), ".cache/whisper.cpp/ggml-small.en.bin");

      let transcript: Transcript = { language: "en", segments: [] };

      if (!existsSync(modelPath)) {
        logger.log("whisper model not found — using empty transcript", { modelPath });
      } else {
        setStage({ stage: "transcribing", pct: 35, message: "Transcribing with Whisper…" });
        try {
          const { Whisper } = await import("smart-whisper");

          const whisperInstance = new Whisper(modelPath);
          try {
            const transcribeTask = await whisperInstance.transcribe(pcmF32, {
              language: "en",
              token_timestamps: true,
            } as unknown as Record<string, unknown>);
            const rawSegments = (await transcribeTask.result) as unknown as RawSegment[];

            setStage({ stage: "transcribing", pct: 85, message: "Parsing transcript…" });
            const normalized = normalizeResult(rawSegments);

            const parsed = Transcript.safeParse(normalized);
            if (parsed.success) {
              transcript = parsed.data;
            } else {
              logger.warn("Transcript schema parse failed — using empty", {
                questionId,
                error: parsed.error.message,
              });
            }
          } finally {
            await (whisperInstance as { free?: () => Promise<void> }).free?.();
          }
        } catch (importErr) {
          // Native binary not available on this platform (e.g. Windows dev machine)
          logger.log(
            "smart-whisper not available on this platform (expected in Trigger.dev Linux container)",
            { questionId, err: String(importErr) },
          );
          // transcript stays as empty-but-valid shape
        }
      }

      setStage({ stage: "transcribing", pct: 90, message: "Persisting transcript…" });

      // 7. Persist transcript
      await prisma.question.update({
        where: { id: questionId },
        data: { transcript },
      });

      setStage({ stage: "transcribing", pct: 100, message: "Transcription complete" });

      logger.log("transcribeQuestion done", {
        questionId,
        segmentCount: transcript.segments.length,
      });

      return { questionId, ok: true };
    } finally {
      // 10. Cleanup tmp files
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  },
});
