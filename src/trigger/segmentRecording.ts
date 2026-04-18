import { logger, task } from "@trigger.dev/sdk/v3";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";
import { detectScenes } from "@/lib/ffmpeg";
import { parseFfmpegPctFromChunk } from "@/lib/progress-parsers";
import { downloadToTmp } from "@/lib/r2-download";
import { r2Client, bucket, keys } from "@/lib/r2";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Probe duration via ffprobe. Returns 0 if probe fails. */
async function probeDurationSec(filePath: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ]);
    let out = "";
    proc.stdout.on("data", (chunk: Buffer) => { out += chunk.toString("utf8"); });
    proc.on("error", () => resolve(0));
    proc.on("close", () => {
      const val = parseFloat(out.trim());
      resolve(Number.isFinite(val) ? val : 0);
    });
  });
}

/**
 * Merge raw scene timestamps into [startSec, endSec] segment pairs.
 * Filters out scenes < 15s apart; ensures each segment is >= 30s.
 */
function buildSegments(
  sceneTimes: number[],
  totalDurationSec: number,
): Array<{ startSec: number; endSec: number }> {
  // Start boundaries: 0 plus each scene time
  const starts = [0, ...sceneTimes];

  // Filter: drop scene changes that are less than 15s after the previous kept start
  const kept: number[] = [];
  for (const t of starts) {
    if (kept.length === 0 || t - kept[kept.length - 1]! >= 15) {
      kept.push(t);
    }
  }

  // Build pairs
  const segments: Array<{ startSec: number; endSec: number }> = [];
  for (let i = 0; i < kept.length; i++) {
    const startSec = kept[i]!;
    const endSec = i + 1 < kept.length ? kept[i + 1]! : totalDurationSec;
    if (endSec - startSec >= 30) {
      segments.push({ startSec, endSec });
    }
  }
  return segments;
}

/** Fallback: split total duration into equal thirds (each ≥ 30s). */
function equalThirds(totalDurationSec: number): Array<{ startSec: number; endSec: number }> {
  const third = totalDurationSec / 3;
  return [
    { startSec: 0, endSec: third },
    { startSec: third, endSec: third * 2 },
    { startSec: third * 2, endSec: totalDurationSec },
  ];
}

/**
 * Upload a local file to R2 using PutObjectCommand directly.
 */
async function uploadFileToR2(filePath: string, r2Key: string, contentType: string): Promise<void> {
  const buf = await readFile(filePath);
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: r2Key,
    Body: buf,
    ContentType: contentType,
  });
  await r2Client().send(cmd);
}

/**
 * Run an ffmpeg command, streaming stderr to a progress callback.
 * Resolves on exit 0; rejects on non-zero. Logs and resolves with false on non-zero
 * when `tolerateFailure` is true (used for per-clip extraction so one bad clip
 * doesn't abort the whole job).
 */
function spawnFfmpeg(
  args: string[],
  onStderrChunk?: (chunk: string) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderrBuf = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBuf += text;
      onStderrChunk?.(text);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderrBuf.slice(-500)}`));
      } else {
        resolve();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const segmentRecording = task({
  id: "segmentRecording",
  maxDuration: 60 * 30,
  run: async (payload: { recordingId: string }) => {
    const { recordingId } = payload;
    const setStage = makeThrottledStage();

    setStage({ stage: "segmenting", pct: 0, message: "Fetching recording…" });

    // 1. Fetch Recording
    const recording = await prisma.recording.findUniqueOrThrow({
      where: { id: recordingId },
    });

    if (!recording.r2Key) {
      throw new Error(`Recording ${recordingId} has no r2Key — cannot segment`);
    }
    const r2Key = recording.r2Key;

    // 2. Download raw recording to tmp
    setStage({ stage: "segmenting", pct: 2, message: "Downloading recording…" });
    const tmpPath = await downloadToTmp(r2Key, "webm");
    const workDir = dirname(tmpPath);

    try {
      // 3. Determine total duration
      let totalDurationSec = recording.durationSec ?? 0;
      if (totalDurationSec <= 0) {
        setStage({ stage: "segmenting", pct: 4, message: "Probing duration…" });
        totalDurationSec = await probeDurationSec(tmpPath);
        logger.log("probed duration", { totalDurationSec });
      }
      if (totalDurationSec <= 0) totalDurationSec = 60; // ultimate fallback

      // 4. Signal A — scene detection (accounts for 0→40% of progress)
      setStage({ stage: "segmenting", pct: 5, message: "Detecting scene changes…" });

      let sceneTimestamps: number[] = [];
      let detectionMethod = "ffmpeg-scene-detection";

      try {
        sceneTimestamps = await detectScenes({
          input: tmpPath,
          totalDurationSec,
          threshold: 0.3,
          onProgress: (pct) => {
            setStage({
              stage: "segmenting",
              pct: Math.round(pct * 0.4),
              message: `Scene detection ${Math.round(pct)}%`,
            });
          },
        });
      } catch (err) {
        logger.warn("scene detection failed, using equal thirds", { err: String(err) });
        detectionMethod = "equal-thirds-fallback";
      }

      // 5. Signal B — plausibility check
      let segments: Array<{ startSec: number; endSec: number }>;

      if (sceneTimestamps.length < 2 && totalDurationSec > 120 || sceneTimestamps.length === 0) {
        logger.log("insufficient scene changes, falling back to equal thirds", {
          sceneCount: sceneTimestamps.length,
          totalDurationSec,
        });
        segments = equalThirds(totalDurationSec);
        detectionMethod = "equal-thirds-fallback";
      } else {
        // 6. Merge: filter scenes < 15s apart, ensure >= 30s segments
        segments = buildSegments(sceneTimestamps, totalDurationSec);
        if (segments.length === 0) {
          segments = equalThirds(totalDurationSec);
          detectionMethod = "equal-thirds-fallback";
        }
      }

      logger.log("segments determined", { count: segments.length, method: detectionMethod });

      setStage({ stage: "segmenting", pct: 40, message: `Extracting ${segments.length} clips…` });

      const questionIds: string[] = [];

      // 7. For each segment
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        const segProgress = 40 + Math.round((i / segments.length) * 60);

        setStage({
          stage: "segmenting",
          pct: segProgress,
          message: `Extracting clip ${i + 1}/${segments.length}…`,
        });

        // 7a. Create Question row first to get a questionId
        const question = await prisma.question.create({
          data: {
            recordingId,
            startSec: seg.startSec,
            endSec: seg.endSec,
            clipR2Key: null,
            thumbnailR2Key: null,
            section: null,
            status: "pending",
            noAudio: false,
            segmentationSignals: {
              sceneCount: sceneTimestamps.length,
              totalDurationSec,
              method: detectionMethod,
              precision: "provisional",
            },
          },
        });
        const questionId = question.id;

        const clipTmpPath = join(workDir, `clip-${questionId}.webm`);
        const thumbTmpPath = join(workDir, `thumb-${questionId}.jpg`);
        let clipUploaded = false;
        let thumbUploaded = false;

        try {
          // 7b. Extract clip
          await spawnFfmpeg(
            [
              "-ss", String(seg.startSec),
              "-to", String(seg.endSec),
              "-i", tmpPath,
              "-c", "copy",
              "-y",
              clipTmpPath,
            ],
            (chunk) => {
              const pct = parseFfmpegPctFromChunk(chunk, seg.endSec - seg.startSec);
              if (pct !== null) {
                setStage({
                  stage: "segmenting",
                  pct: segProgress + Math.round((pct / 100) * (60 / segments.length) * 0.7),
                  message: `Clip ${i + 1}/${segments.length}: encoding ${pct}%`,
                });
              }
            },
          ).catch((err: Error) => {
            logger.warn(`ffmpeg clip extraction failed for segment ${i}`, { err: err.message });
            throw err; // re-throw so we skip this question
          });

          // 7c. Extract thumbnail
          await spawnFfmpeg(
            [
              "-ss", String(seg.startSec + 1),
              "-i", tmpPath,
              "-frames:v", "1",
              "-vf", "scale=640:-1",
              "-y",
              thumbTmpPath,
            ],
          ).catch((err: Error) => {
            // Thumbnail failure is non-fatal
            logger.warn(`thumbnail extraction failed for segment ${i}`, { err: err.message });
          });

          // 7d. Upload clip to R2
          const clipKey = keys.clipVideo(questionId);
          await uploadFileToR2(clipTmpPath, clipKey, "video/webm");
          clipUploaded = true;

          // 7e. Upload thumbnail (if it was created)
          let thumbKey: string | null = null;
          try {
            const thumbKey_ = keys.clipThumbnail(questionId);
            await uploadFileToR2(thumbTmpPath, thumbKey_, "image/jpeg");
            thumbKey = thumbKey_;
            thumbUploaded = true;
          } catch {
            // thumbnail upload failure is non-fatal
          }

          // 7f. Update Question with r2 keys
          await prisma.question.update({
            where: { id: questionId },
            data: {
              clipR2Key: clipKey,
              thumbnailR2Key: thumbKey,
            },
          });

          questionIds.push(questionId);

          // 7g. Sub-progress
          setStage({
            stage: "segmenting",
            pct: 40 + Math.round(((i + 1) / segments.length) * 60),
            message: `Clip ${i + 1}/${segments.length} ready`,
          });
        } catch (err) {
          logger.warn(`Skipping segment ${i} due to error`, {
            questionId,
            err: String(err),
            clipUploaded,
            thumbUploaded,
          });
          // Mark question as failed but don't throw — continue with next segment
          await prisma.question.update({
            where: { id: questionId },
            data: { status: "failed" },
          }).catch(() => undefined);
        } finally {
          // Clean up per-clip tmp files
          await rm(clipTmpPath, { force: true }).catch(() => undefined);
          await rm(thumbTmpPath, { force: true }).catch(() => undefined);
        }
      }

      setStage({ stage: "segmenting", pct: 100, message: "Segmentation complete" });

      logger.log("segmentRecording done", { questionIds });
      return { questionIds };
    } finally {
      // 9. Cleanup main tmp file and work dir
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  },
});
