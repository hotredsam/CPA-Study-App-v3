import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { keys, presignUpload } from "@/lib/r2";

export const dynamic = "force-dynamic";

const StartBody = z.object({
  durationSec: z.number().int().min(1).max(60 * 60 * 4).optional(),
  contentType: z.string().default("video/webm"),
});

export async function POST(request: Request) {
  const parsed = StartBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const recording = await prisma.recording.create({
    data: {
      status: "uploading",
      durationSec: parsed.data.durationSec ?? null,
    },
  });

  const key = keys.recordingRaw(recording.id);
  const uploadUrl = await presignUpload(key, parsed.data.contentType);

  await prisma.recording.update({
    where: { id: recording.id },
    data: { r2Key: key },
  });

  return NextResponse.json({
    recordingId: recording.id,
    uploadUrl,
    r2Key: key,
    expiresInSec: 900,
  });
}
