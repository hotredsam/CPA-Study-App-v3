import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const ListQuery = z.object({
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["uploading", "uploaded", "segmenting", "processing_questions", "done", "failed"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ListQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "invalid query", parsed.error.flatten());
    }
    const { q, cursor, limit, status } = parsed.data;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Text search: match recordings that have questions with matching transcript
    // Uses Prisma's raw SQL for ILIKE on JSON cast. No GIN index needed at this data volume.
    let matchingRecordingIds: string[] | undefined;
    if (q) {
      const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
      const rows = await prisma.$queryRaw<{ recordingId: string }[]>`
        SELECT DISTINCT "recordingId"
        FROM "Question"
        WHERE transcript::text ILIKE ${pattern}
           OR extracted::text ILIKE ${pattern}
        LIMIT 200
      `;
      matchingRecordingIds = rows.map((r) => r.recordingId);
      where.id = { in: matchingRecordingIds };
    }

    const recordings = await prisma.recording.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        durationSec: true,
        createdAt: true,
        _count: { select: { questions: true } },
        questions: {
          select: {
            feedback: { select: { combinedScore: true } },
          },
        },
      },
    });

    const hasMore = recordings.length > limit;
    const items = (hasMore ? recordings.slice(0, limit) : recordings).map((r) => {
      const scores = r.questions.flatMap((q) => q.feedback?.combinedScore != null ? [q.feedback.combinedScore] : []);
      return {
        id: r.id,
        status: r.status,
        durationSec: r.durationSec,
        createdAt: r.createdAt,
        questionCount: r._count.questions,
        avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      };
    });
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return NextResponse.json({ items, nextCursor, hasMore, total: items.length });
  } catch (err) {
    return respond(err);
  }
}
