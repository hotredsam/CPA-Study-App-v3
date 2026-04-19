import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [textbooks, ankiDue] = await Promise.all([
      prisma.textbook.findMany({
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          title: true,
          sections: true,
          chunkCount: true,
          indexStatus: true,
          indexedAt: true,
        },
      }),
      prisma.reviewState.count({
        where: { nextReviewAt: { lte: new Date() } },
      }),
    ]);

    // Find the most recently indexed textbook (with READY status, most chunks)
    const readyTextbooks = textbooks.filter((t) => t.indexStatus === "READY");
    const recentTextbook = readyTextbooks.length > 0 ? readyTextbooks[0] : null;

    // We don't store lastChunkIdx on the textbook model — default to 0 for resume
    const recentTextbookData = recentTextbook
      ? {
          id: recentTextbook.id,
          title: recentTextbook.title,
          lastChunkIdx: 0,
          totalChunks: recentTextbook.chunkCount,
        }
      : null;

    return NextResponse.json({
      recentTextbook: recentTextbookData,
      textbooks,
      cardsDue: ankiDue,
    });
  } catch (err) {
    return respond(err);
  }
}
