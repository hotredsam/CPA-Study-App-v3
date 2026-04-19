import { prisma } from "@/lib/prisma";

export interface EnqueueResult {
  jobId: string;
  expectedCompletionAt: Date;
}

const DEFAULT_COALESCE_WINDOW_SEC = 6 * 3600; // 6 hours

/**
 * Enqueue a new BatchJob for the given functionKey.
 * The coalesce window begins now and ends at now + coalesceWindowSec.
 */
export async function enqueue(
  functionKey: string,
  payload: unknown,
  coalesceWindowSec: number = DEFAULT_COALESCE_WINDOW_SEC,
  offPeakPreferred: boolean = false,
): Promise<EnqueueResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + coalesceWindowSec * 1000);

  const job = await prisma.batchJob.create({
    data: {
      functionKey,
      payload: payload as Parameters<typeof prisma.batchJob.create>[0]["data"]["payload"],
      status: "QUEUED",
      coalesceWindowStart: now,
      coalesceWindowEnd: windowEnd,
      offPeakPreferred,
    },
  });

  return {
    jobId: job.id,
    expectedCompletionAt: windowEnd,
  };
}

interface QueueSummaryRow {
  functionKey: string;
  queued: number;
  nextRunAt: Date | null;
}

/**
 * Returns a grouped summary of all queued batch jobs.
 * Each row contains the functionKey, count of queued jobs, and the earliest
 * coalesceWindowEnd within that group (i.e. when the next run could fire).
 */
export async function getQueueSummary(): Promise<QueueSummaryRow[]> {
  const jobs = await prisma.batchJob.findMany({
    where: { status: "QUEUED" },
    select: {
      functionKey: true,
      coalesceWindowEnd: true,
    },
  });

  // Group by functionKey
  const groups = new Map<string, { count: number; minEnd: Date | null }>();

  for (const job of jobs) {
    const existing = groups.get(job.functionKey);
    if (existing === undefined) {
      groups.set(job.functionKey, {
        count: 1,
        minEnd: job.coalesceWindowEnd,
      });
    } else {
      existing.count += 1;
      if (job.coalesceWindowEnd !== null) {
        if (existing.minEnd === null || job.coalesceWindowEnd < existing.minEnd) {
          existing.minEnd = job.coalesceWindowEnd;
        }
      }
    }
  }

  return Array.from(groups.entries()).map(([functionKey, { count, minEnd }]) => ({
    functionKey,
    queued: count,
    nextRunAt: minEnd,
  }));
}
