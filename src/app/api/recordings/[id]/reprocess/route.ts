import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { copyObject, keys } from "@/lib/r2";
import { processRecording } from "@/trigger/processRecording";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVE_PIPELINE_STATUSES = ["uploaded", "segmenting", "processing_questions"] as const;

function isActivePipelineStatus(status: string): boolean {
  return ACTIVE_PIPELINE_STATUSES.some((activeStatus) => activeStatus === status);
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;

    const recording = await prisma.recording.findUnique({ where: { id } });
    if (!recording) {
      throw new ApiError("NOT_FOUND", `Recording ${id} not found`);
    }
    if (!recording.r2Key) {
      throw new ApiError("BAD_REQUEST", "Recording has no uploaded file — cannot reprocess");
    }
    if (recording.triggerRunId && isActivePipelineStatus(recording.status)) {
      throw new ApiError("UNPROCESSABLE", "Recording is already queued or processing.", {
        recordingId: id,
        status: recording.status,
        triggerRunId: recording.triggerRunId,
      });
    }

    const questionCount = await prisma.question.count({ where: { recordingId: id } });
    if (questionCount > 0) {
      let replacement = await prisma.recording.create({
        data: {
          status: "uploading",
          title: recording.title ? `${recording.title} (reprocess)` : "Reprocessed recording",
          sections: recording.sections,
          durationSec: recording.durationSec,
          modelUsed: recording.modelUsed,
        },
      });
      const replacementKey = keys.recordingRaw(replacement.id);
      await copyObject(recording.r2Key, replacementKey);
      replacement = await prisma.recording.update({
        where: { id: replacement.id },
        data: {
          r2Key: replacementKey,
          status: "uploaded",
        },
      });

      const run = await processRecording.trigger({ recordingId: replacement.id });
      await prisma.recording.update({
        where: { id: replacement.id },
        data: { triggerRunId: run.id },
      });
      await prisma.stageProgress.create({
        data: {
          recordingId: replacement.id,
          stage: "uploading",
          pct: 100,
          etaSec: null,
          message: "Copied prior upload; replacement pipeline queued",
        },
      });

      return NextResponse.json({
        recordingId: replacement.id,
        sourceRecordingId: id,
        runId: run.id,
        preservedPriorReview: true,
      });
    }

    const run = await processRecording.trigger({ recordingId: id });

    await prisma.$transaction([
      prisma.question.deleteMany({ where: { recordingId: id } }),
      prisma.stageProgress.deleteMany({ where: { recordingId: id } }),
      prisma.recording.update({
        where: { id },
        data: { status: "uploaded", triggerRunId: run.id },
      }),
    ]);

    return NextResponse.json({ recordingId: id, runId: run.id });
  } catch (err) {
    return respond(err);
  }
}
