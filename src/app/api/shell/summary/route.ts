import type { CpaSection, RecordingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { countDueAnkiCards } from "@/lib/anki-due";
import { respond } from "@/lib/api-error";
import { getActiveExamSections } from "@/lib/exam-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LIVE_RECORDING_STATUSES: RecordingStatus[] = [
  "uploaded",
  "segmenting",
  "processing_questions",
];
const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date();
    const activeSections = await getActiveExamSections();
    const liveSince = new Date(now.getTime() - STALE_PIPELINE_MS);

    const [recordingHours, pipelineCount, ankiCount] = await Promise.all([
      prisma.recording.aggregate({ _sum: { durationSec: true } }),
      prisma.recording.count({
        where: {
          status: { in: LIVE_RECORDING_STATUSES },
          updatedAt: { gte: liveSince },
        },
      }),
      countDueAnkiCards({ sections: activeSections as unknown as CpaSection[], now }),
    ]);

    return NextResponse.json(
      {
        totalHours: Number(((recordingHours._sum.durationSec ?? 0) / 3600).toFixed(1)),
        pipelineCount,
        ankiCount,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
        },
      },
    );
  } catch (err) {
    return respond(err);
  }
}
