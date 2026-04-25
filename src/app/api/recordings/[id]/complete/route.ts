import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { processRecording } from "@/trigger/processRecording";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.recording.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", "recording not found");
    }

    const handle = await tasks.trigger<typeof processRecording>("processRecording", {
      recordingId: id,
    });

    const recording = await prisma.recording.update({
      where: { id },
      data: { status: "uploaded", triggerRunId: handle.id },
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
