import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { runAnkiGen } from "@/lib/ai/anki-gen";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  topicId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(params);

    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "topicId is required", parsed.error.flatten());
    }

    const { topicId } = parsed.data;

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new ApiError("NOT_FOUND", `Topic not found: ${topicId}`);
    }

    const chunks = await prisma.chunk.findMany({
      where: { topicId },
      orderBy: { order: "asc" },
    });

    let count = 0;
    for (const chunk of chunks) {
      await runAnkiGen({
        chunkId: chunk.id,
        content: chunk.content,
        topicId,
      });
      count++;
    }

    return NextResponse.json({ count, topicId });
  } catch (err) {
    return respond(err);
  }
}
