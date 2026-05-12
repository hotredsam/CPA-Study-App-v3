import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { processRecording } from "@/trigger/processRecording";
import { ApiError, respond } from "@/lib/api-error";
import { headObject } from "@/lib/r2";
import { isAllowedRecordingUpload, MAX_RECORDING_UPLOAD_BYTES } from "@/lib/upload-constraints";

export const dynamic = "force-dynamic";

const ACTIVE_PIPELINE_STATUSES = ["uploaded", "segmenting", "processing_questions"] as const;
const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000;

function activeRecordingLimit(): number {
  const parsed = Number(process.env["TRIGGER_ACTIVE_RECORDING_LIMIT"] ?? "3");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 3;
}

function isActivePipelineStatus(status: string): boolean {
  return ACTIVE_PIPELINE_STATUSES.some((activeStatus) => activeStatus === status);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.recording.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", "recording not found");
    }
    if (!existing.r2Key) {
      throw new ApiError("UNPROCESSABLE", "Recording upload is not ready yet.");
    }
    const object = await headObject(existing.r2Key);
    const sizeBytes = object.ContentLength ?? 0;
    if (sizeBytes <= 0) {
      throw new ApiError("UNPROCESSABLE", "Uploaded recording object is empty.");
    }
    if (sizeBytes > MAX_RECORDING_UPLOAD_BYTES) {
      throw new ApiError("BAD_REQUEST", "Uploaded recording is too large.", {
        maxBytes: MAX_RECORDING_UPLOAD_BYTES,
        sizeBytes,
      }, 413);
    }
    if (!isAllowedRecordingUpload({ fileName: existing.r2Key, contentType: object.ContentType })) {
      throw new ApiError("BAD_REQUEST", "Unsupported uploaded recording type.");
    }
    if (existing.triggerRunId && isActivePipelineStatus(existing.status)) {
      throw new ApiError("UNPROCESSABLE", "Recording is already queued or processing.", {
        recordingId: id,
        status: existing.status,
        triggerRunId: existing.triggerRunId,
      });
    }

    const activeCount = await prisma.recording.count({
      where: {
        id: { not: id },
        status: { in: [...ACTIVE_PIPELINE_STATUSES] },
        updatedAt: { gte: new Date(Date.now() - STALE_PIPELINE_MS) },
      },
    });
    const limit = activeRecordingLimit();
    if (activeCount >= limit) {
      throw new ApiError("RATE_LIMITED", "Too many recordings are already processing. Try again shortly.", {
        activeCount,
        limit,
      });
    }

    const claim = await prisma.recording.updateMany({
      where: {
        id,
        status: { in: ["uploading", "failed"] },
        OR: [
          { triggerRunId: null },
          { status: "failed" },
        ],
      },
      data: { status: "uploaded", triggerRunId: null },
    });
    if (claim.count !== 1) {
      const current = await prisma.recording.findUnique({ where: { id } });
      throw new ApiError("UNPROCESSABLE", "Recording could not be claimed for processing.", {
        recordingId: id,
        status: current?.status ?? null,
        triggerRunId: current?.triggerRunId ?? null,
      });
    }

    let handle: Awaited<ReturnType<typeof tasks.trigger<typeof processRecording>>>;
    try {
      handle = await tasks.trigger<typeof processRecording>("processRecording", {
        recordingId: id,
      });
    } catch (err) {
      await prisma.recording.update({
        where: { id },
        data: { status: "failed", triggerRunId: null },
      });
      throw err;
    }

    const recording = await prisma.recording.update({
      where: { id },
      data: { triggerRunId: handle.id },
    });

    await prisma.stageProgress.create({
      data: {
        recordingId: id,
        stage: "uploading",
        pct: 100,
        etaSec: null,
        message: "Upload complete; pipeline queued",
      },
    });

    return NextResponse.json({
      recording,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (err) {
    return respond(err);
  }
}
