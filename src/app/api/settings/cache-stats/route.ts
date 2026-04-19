import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const COST_PER_HIT_USD = 0.001;

/**
 * GET /api/settings/cache-stats
 * Returns aggregate cache statistics.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date();

    const [totalEntries, expiredEntries, hitSumResult] = await Promise.all([
      prisma.cacheEntry.count(),
      prisma.cacheEntry.count({ where: { expiresAt: { lt: now } } }),
      prisma.cacheEntry.aggregate({ _sum: { hitCount: true }, _count: { id: true } }),
    ]);

    const totalHits = hitSumResult._sum.hitCount ?? 0;
    const count = hitSumResult._count.id;
    const hitRate = count > 0 ? totalHits / count : 0;
    const savingsUsd = totalHits * COST_PER_HIT_USD;

    return NextResponse.json({
      hitRate,
      totalEntries,
      expiredEntries,
      savingsUsd,
    });
  } catch (err) {
    return respond(err);
  }
}
