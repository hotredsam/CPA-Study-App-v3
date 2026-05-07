import type { CpaSection, RecordingStatus } from "@prisma/client";
import type { DashboardData } from "@/app/DashboardClient";
import { isActiveCpaSection } from "@/lib/cpa-sections";
import { getActiveExamSections } from "@/lib/exam-settings";
import { normalizePercent } from "@/lib/percent";
import { prisma } from "@/lib/prisma";

const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000;

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  studyStats: { totalHours: 0, weekHours: 0, streak: 0, recordingsCount: 0 },
  sections: [],
  weakestTopics: [],
  recentRecordings: [],
  cardsDue: 0,
  currentTextbookFocus: null,
  routine: null,
};

export async function readDashboardData(): Promise<DashboardData> {
  const activeSections = await getActiveExamSections();
  const activePrismaSections = activeSections as unknown as CpaSection[];
  const staleBefore = new Date(Date.now() - STALE_PIPELINE_MS);

  await prisma.recording.updateMany({
    where: {
      status: { in: ["uploading", "uploaded", "segmenting", "processing_questions"] },
      updatedAt: { lt: staleBefore },
    },
    data: { status: "failed" },
  });

  const freshPipelineCutoff = new Date(Date.now() - STALE_PIPELINE_MS);
  const liveStatuses: RecordingStatus[] = ["uploaded", "segmenting", "processing_questions"];
  const activeRecordingWhere = {
    OR: [
      { status: "done" as const },
      {
        status: { in: liveStatuses },
        updatedAt: { gte: freshPipelineCutoff },
      },
    ],
  };

  const [allRecordings, recentRecordings, topics, ankiDueRaw, focusTextbook] = await Promise.all([
    prisma.recording.findMany({
      where: activeRecordingWhere,
      select: {
        id: true,
        durationSec: true,
        createdAt: true,
        segmentsCount: true,
        status: true,
      },
    }),
    prisma.recording.findMany({
      where: activeRecordingWhere,
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true,
        segmentsCount: true,
      },
    }),
    prisma.topic.findMany({
      where: { section: { in: activePrismaSections } },
      select: {
        id: true,
        section: true,
        name: true,
        mastery: true,
        errorRate: true,
        lastSeen: true,
      },
      orderBy: { mastery: "asc" },
    }),
    prisma.ankiCard.count({
      where: {
        section: { in: activePrismaSections },
        srsState: {
          path: ["nextDue"],
          lte: new Date().toISOString(),
          not: null as unknown as string,
        },
      },
    }),
    prisma.textbook.findFirst({
      where: {
        indexStatus: "READY",
        OR: [
          { sections: { isEmpty: true } },
          { sections: { hasSome: activePrismaSections } },
        ],
      },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        title: true,
        sections: true,
        chunkCount: true,
        chunks: {
          orderBy: { order: "asc" },
          take: 1,
          select: {
            order: true,
            title: true,
            chapterRef: true,
          },
        },
      },
    }),
  ]);

  const totalHours = allRecordings.reduce((sum, r) => sum + (r.durationSec ?? 0), 0) / 3600;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekHours =
    allRecordings
      .filter((r) => new Date(r.createdAt) >= oneWeekAgo)
      .reduce((sum, r) => sum + (r.durationSec ?? 0), 0) / 3600;

  const recordingDays = new Set(allRecordings.map((r) => new Date(r.createdAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (recordingDays.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  const sectionMap = new Map<string, { topicCount: number; masterySum: number }>();
  for (const topic of topics) {
    const key = String(topic.section);
    const existing = sectionMap.get(key) ?? { topicCount: 0, masterySum: 0 };
    existing.topicCount++;
    existing.masterySum += normalizePercent(topic.mastery);
    sectionMap.set(key, existing);
  }

  const sectionHoursShare = Number((totalHours / Math.max(activeSections.length, 1)).toFixed(1));
  const sections = activeSections.map((section) => {
    const agg = sectionMap.get(section) ?? { topicCount: 0, masterySum: 0 };
    return {
      section,
      hoursStudied: sectionHoursShare,
      mastery: agg.topicCount > 0 ? Math.round(agg.masterySum / agg.topicCount) : 0,
      examDate: null,
      topicCount: agg.topicCount,
    };
  });

  const weakestTopics = topics.slice(0, 5).map((topic) => ({
    id: topic.id,
    name: topic.name,
    section: String(topic.section),
    mastery: normalizePercent(topic.mastery),
    errorRate: topic.errorRate != null ? Math.round(topic.errorRate * 100) : 0,
  }));

  const focusSection =
    focusTextbook?.sections.find((section) => isActiveCpaSection(section) && activeSections.includes(section)) ?? null;

  return {
    studyStats: {
      totalHours: Number(totalHours.toFixed(1)),
      weekHours: Number(weekHours.toFixed(1)),
      streak,
      recordingsCount: allRecordings.length,
      processingCount: allRecordings.filter((recording) => recording.status !== "done").length,
    },
    sections,
    weakestTopics,
    recentRecordings: recentRecordings.map((recording) => ({
      id: recording.id,
      title: recording.title,
      createdAt: recording.createdAt.toISOString(),
      status: recording.status,
      segmentsCount: recording.segmentsCount,
    })),
    cardsDue: ankiDueRaw,
    currentTextbookFocus: focusTextbook
      ? {
          section: focusSection,
          title: focusTextbook.chunks[0]?.title ?? focusTextbook.chunks[0]?.chapterRef ?? focusTextbook.title,
          detail: `${focusTextbook.title} - chunk ${(focusTextbook.chunks[0]?.order ?? 0) + 1} of ${Math.max(focusTextbook.chunkCount, 1)}`,
          href: `/study/${focusTextbook.id}/${focusTextbook.chunks[0]?.order ?? 0}`,
        }
      : null,
    routine: null,
  };
}
