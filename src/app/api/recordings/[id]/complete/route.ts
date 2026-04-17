import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import type { processRecording } from "@/trigger/processRecording";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.recording.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "recording not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof processRecording>("processRecording", {
    recordingId: id,
  });

  const recording = await prisma.recording.update({
    where: { id },
    data: { status: "uploaded", triggerRunId: handle.id },
  });

  return NextResponse.json({
    recording,
    runId: handle.id,
    publicAccessToken: handle.publicAccessToken,
  });
}
