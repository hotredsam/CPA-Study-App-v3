import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { offset, limit } = QuerySchema.parse(Object.fromEntries(searchParams));

    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      throw new ApiError("NOT_FOUND", `Textbook ${id} not found`);
    }

    const [total, chunks] = await Promise.all([
      prisma.chunk.count({ where: { textbookId: id } }),
      prisma.chunk.findMany({
        where: { textbookId: id },
        orderBy: { order: "asc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          order: true,
          chapterRef: true,
          title: true,
          content: true,
          htmlContent: true,
          topicId: true,
          fasbCitation: true,
          figures: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ total, chunks });
  } catch (err) {
    return respond(err);
  }
}
