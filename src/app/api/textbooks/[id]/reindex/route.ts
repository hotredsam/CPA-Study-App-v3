import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { queueTextbookIndex } from "@/lib/textbooks/queue";

export const dynamic = "force-dynamic";

type TextbookWithCount = Awaited<ReturnType<typeof prisma.textbook.findFirstOrThrow>> & {
  _count?: { chunks: number };
};

function serializeTextbook(textbook: TextbookWithCount) {
  return {
    id: textbook.id,
    title: textbook.title,
    publisher: textbook.publisher,
    sections: textbook.sections,
    pages: textbook.pages,
    chunkCount: textbook._count?.chunks ?? textbook.chunkCount,
    indexStatus: textbook.indexStatus,
    sizeBytes: textbook.sizeBytes?.toString() ?? null,
    citedCount: textbook.citedCount,
    uploadedAt: textbook.uploadedAt,
    indexedAt: textbook.indexedAt,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.textbook.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", `Textbook ${id} not found`);
    }
    if (!existing.r2Key) {
      throw new ApiError("UNPROCESSABLE", "Upload a PDF before re-indexing this textbook.");
    }

    await prisma.textbook.update({
      where: { id },
      data: { indexStatus: "INDEXING", indexedAt: null },
    });

    try {
      await queueTextbookIndex({ textbookId: id, rebuildChunks: true });
    } catch (queueErr) {
      console.warn("[textbooks/reindex] index queue skipped:", queueErr);
      await prisma.textbook.update({
        where: { id },
        data: { indexStatus: "QUEUED" },
      });
    }

    const updated = await prisma.textbook.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { chunks: true } } },
    });

    return NextResponse.json({
      textbook: serializeTextbook(updated),
    });
  } catch (err) {
    return respond(err);
  }
}
