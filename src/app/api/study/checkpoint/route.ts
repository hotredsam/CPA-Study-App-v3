import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { runCheckpointQuiz } from "@/lib/ai/checkpoint-quiz";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  chunkId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(params);

    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "chunkId is required", parsed.error.flatten());
    }

    const { chunkId } = parsed.data;

    const chunk = await prisma.chunk.findUnique({
      where: { id: chunkId },
      include: { topic: { select: { name: true } } },
    });

    if (!chunk) {
      throw new ApiError("NOT_FOUND", `Chunk not found: ${chunkId}`);
    }

    const result = await runCheckpointQuiz({
      chunkId: chunk.id,
      content: chunk.content,
      topicName: chunk.topic?.name ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    return respond(err);
  }
}
