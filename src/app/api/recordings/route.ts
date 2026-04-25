import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { keys, presignUpload } from "@/lib/r2";
import { ApiError, respond } from "@/lib/api-error";
import { CPA_SECTION_OPTIONS, isActiveCpaSection } from "@/lib/cpa-sections";

export const dynamic = "force-dynamic";

const RECORDING_STATUSES = [
  "uploading",
  "uploaded",
  "segmenting",
  "processing_questions",
  "done",
  "failed",
] as const;

const RecordingStatusSchema = z.enum(RECORDING_STATUSES);
const CpaSectionSchema = z.enum(CPA_SECTION_OPTIONS);
const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000;

const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  liveOnly: z.coerce.boolean().optional(),
});

function parseStatusFilter(raw?: string): Array<(typeof RECORDING_STATUSES)[number]> | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return undefined;

  const invalid = values.filter((s) => !RecordingStatusSchema.safeParse(s).success);
  if (invalid.length > 0) {
    throw new ApiError("BAD_REQUEST", `invalid status: ${invalid.join(", ")}`);
  }

  return values as Array<(typeof RECORDING_STATUSES)[number]>;
}

async function markStalePipelineRecordings(): Promise<void> {
  await prisma.recording.updateMany({
    where: {
      status: { in: ["uploaded", "segmenting", "processing_questions"] },
      updatedAt: { lt: new Date(Date.now() - STALE_PIPELINE_MS) },
    },
    data: {
      status: "failed",
      tagStage: {
        status: "failed",
        completedAt: new Date().toISOString(),
        pct: 0,
        reason: "Pipeline did not report progress within the stale-record window.",
      },
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ListQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "invalid query", parsed.error.flatten());
    }
    const { cursor, limit, status, liveOnly } = parsed.data;
    const statusFilter = parseStatusFilter(status);

    if (statusFilter?.some((value) => ["uploaded", "segmenting", "processing_questions"].includes(value))) {
      await markStalePipelineRecordings();
    }

    const recordings = await prisma.recording.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      where: {
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
        ...(liveOnly ? { updatedAt: { gte: new Date(Date.now() - STALE_PIPELINE_MS) } } : {}),
      },
      select: {
        id: true,
        status: true,
        title: true,
        sections: true,
        modelUsed: true,
        durationSec: true,
        segmentsCount: true,
        createdAt: true,
        _count: { select: { questions: true } },
        progress: {
          orderBy: { updatedAt: "asc" },
          select: {
            stage: true,
            pct: true,
            etaSec: true,
            message: true,
            updatedAt: true,
          },
        },
        questions: {
          orderBy: { startSec: "asc" },
          select: {
            id: true,
            status: true,
            section: true,
            feedback: {
              select: {
                combinedScore: true,
              },
            },
          },
        },
      },
    });

    const hasMore = recordings.length > limit;
    const items = (hasMore ? recordings.slice(0, limit) : recordings).map((recording) => ({
      ...recording,
      sections: recording.sections.filter(isActiveCpaSection),
    }));
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return NextResponse.json({ items, nextCursor, hasMore });
  } catch (err) {
    return respond(err);
  }
}

const StartBody = z.object({
  durationSec: z.number().int().min(1).max(60 * 60 * 4).optional(),
  contentType: z.string().default("video/webm"),
  title: z.string().min(1).max(160).optional(),
  sections: z.array(CpaSectionSchema).default([]),
  modelUsed: z.string().min(1).max(120).optional(),
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
        title: parsed.data.title ?? null,
        sections: parsed.data.sections,
        modelUsed: parsed.data.modelUsed ?? null,
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
