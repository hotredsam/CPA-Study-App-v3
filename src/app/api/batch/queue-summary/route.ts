import { NextResponse } from "next/server";
import { getQueueSummary } from "@/lib/batch/queue";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/batch/queue-summary
 * Returns a grouped summary of all queued batch jobs.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const summary = await getQueueSummary();
    return NextResponse.json({ summary });
  } catch (err) {
    return respond(err);
  }
}
