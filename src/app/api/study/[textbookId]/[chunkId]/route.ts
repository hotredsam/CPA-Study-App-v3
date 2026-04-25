import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ textbookId: string; chunkId: string }> },
) {
  try {
    const { textbookId, chunkId } = await params;
    const order = parseInt(chunkId, 10);

    if (isNaN(order) || order < 0) {
      throw new ApiError("BAD_REQUEST", "chunkId must be a non-negative integer index");
    }

    const textbook = await prisma.textbook.findUnique({
      where: { id: textbookId },
      select: {
        id: true,
        title: true,
        sections: true,
        chunkCount: true,
      },
    });

    if (!textbook) {
      throw new ApiError("NOT_FOUND", `Textbook ${textbookId} not found`);
    }

    const chunk = await prisma.chunk.findFirst({
      where: { textbookId, order },
      select: {
        id: true,
        order: true,
        title: true,
        chapterRef: true,
        content: true,
        htmlContent: true,
        topicId: true,
        fasbCitation: true,
      },
    });

    if (!chunk) {
      throw new ApiError("NOT_FOUND", `Chunk at index ${order} not found for textbook ${textbookId}`);
    }

    const topic = chunk.topicId
      ? await prisma.topic.findUnique({
          where: { id: chunk.topicId },
          select: {
            id: true,
            name: true,
            section: true,
            mastery: true,
          },
        })
      : null;

    const prevChunkIdx = order > 0 ? order - 1 : null;
    const nextChunkIdx = order < textbook.chunkCount - 1 ? order + 1 : null;

    return NextResponse.json({
      textbook,
      chunk,
      topic,
      checkpoint: null,
      prevChunkIdx,
      nextChunkIdx,
    });
  } catch (err) {
    return respond(err);
  }
}
