import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const [totalCards, recentReviews] = await Promise.all([
    prisma.ankiCard.count(),
    prisma.ankiReview.findMany({
      where: {
        reviewedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { rating: true, reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
    }),
  ]);

  // Retention rate: GOOD or EASY reviews / total reviews in last 30 days
  let retentionRate: number | null = null;
  if (recentReviews.length > 0) {
    const good = recentReviews.filter(
      (r) => r.rating === "GOOD" || r.rating === "EASY",
    ).length;
    retentionRate = Math.round((good / recentReviews.length) * 100);
  }

  // Streak: count consecutive calendar days (from today backward) with >= 1 review
  const reviewDays = new Set(recentReviews.map((r) => toDateStr(r.reviewedAt)));
  let streak = 0;
  const today = new Date();
  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    if (reviewDays.has(toDateStr(d))) {
      streak++;
    } else if (offset > 0) {
      // Allow missing today (session not started yet)
      break;
    }
  }

  // Backlog: approximate via card count with srsState.nextDue < now
  // Since nextDue is in JSON, use raw count of cards never reviewed as lower bound
  const backlog = await prisma.ankiCard.count({
    where: { reviews: { none: {} } },
  });

  return NextResponse.json({ totalCards, streak, retentionRate, backlog });
}
