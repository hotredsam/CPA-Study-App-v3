import { CpaSection } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveExamSections } from "@/lib/exam-settings";

export const dynamic = "force-dynamic";

export interface AnkiStatsResponse {
  totalCards: number;
  streak: number;
  retentionRate: number | null;
  backlog: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(): Promise<NextResponse<AnkiStatsResponse>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeSections = await getActiveExamSections();
  const cardSectionWhere = { section: { in: activeSections as unknown as CpaSection[] } };

  const [totalCards, goodCount, totalRecentCount, reviewDatesRaw, backlogCount] =
    await Promise.all([
      prisma.ankiCard.count({ where: cardSectionWhere }),
      prisma.ankiReview.count({
        where: {
          card: cardSectionWhere,
          reviewedAt: { gte: thirtyDaysAgo },
          rating: { in: ["GOOD", "EASY"] },
        },
      }),
      prisma.ankiReview.count({
        where: { card: cardSectionWhere, reviewedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.ankiReview.findMany({
        where: { card: cardSectionWhere, reviewedAt: { gte: thirtyDaysAgo } },
        select: { reviewedAt: true },
        orderBy: { reviewedAt: "desc" },
      }),
      prisma.ankiCard.count({ where: { ...cardSectionWhere, reviews: { none: {} } } }),
    ]);

  const retentionRate =
    totalRecentCount > 0
      ? Math.round((goodCount / totalRecentCount) * 100)
      : null;

  const reviewDays = new Set(reviewDatesRaw.map((r) => toDateStr(r.reviewedAt)));
  let streak = 0;
  const today = new Date();
  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    if (reviewDays.has(toDateStr(d))) {
      streak++;
    } else if (offset > 0) {
      break;
    }
  }

  return NextResponse.json({ totalCards, streak, retentionRate, backlog: backlogCount });
}
