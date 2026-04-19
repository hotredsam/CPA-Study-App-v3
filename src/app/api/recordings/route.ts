import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { keys, presignUpload } from "@/lib/r2";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ListQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "invalid query", parsed.error.flatten());
    }
    const { cursor, limit } = parsed.data;

    const recordings = await prisma.recording.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        durationSec: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    const hasMore = recordings.length > limit;
    const items = hasMore ? recordings.slice(0, limit) : recordings;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (err) {
    return respond(err);
  }
}

const StartBody = z.object({
  durationSec: z.number().int().min(1).max(60 * 60 * 4).optional(),
  contentType: z.string().default("video/webm"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = StartBody.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "invalid body", parsed.error.flatten());
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
  } catch (err) {
    return respond(err);
  }
}
