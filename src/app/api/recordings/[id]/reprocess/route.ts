import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRecording } from "@/trigger/processRecording";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // 1. Wipe existing questions (cascade deletes feedback, reviewState)
    await prisma.question.deleteMany({ where: { recordingId: id } });

    // 2. Wipe stage progress
    await prisma.stageProgress.deleteMany({ where: { recordingId: id } });

    // 3. Reset recording status to uploaded
    await prisma.recording.update({
      where: { id },
      data: { status: "uploaded" },
    });

    // 4. Re-trigger pipeline
    const run = await processRecording.trigger({ recordingId: id });

    return NextResponse.json({ recordingId: id, runId: run.id });
  } catch (err) {
    return respond(err);
  }
}
