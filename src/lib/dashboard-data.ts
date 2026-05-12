import type { CpaSection, RecordingStatus } from "@prisma/client";
import type { DashboardData } from "@/app/DashboardClient";
import { countDueAnkiCards, listDueAnkiCardIds } from "@/lib/anki-due";
import { isActiveCpaSection } from "@/lib/cpa-sections";
import { getActiveExamSections } from "@/lib/exam-settings";
import { prisma } from "@/lib/prisma";
import { computeTopicMasteryMetrics } from "@/lib/topic-mastery";

const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000;

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  studyStats: { totalHours: 0, weekHours: 0, streak: 0, recordingsCount: 0 },
  sections: [],
  weakestTopics: [],
  nextStudyActions: [],
  weakTopicDrills: [],
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

  const dueCardIdsPromise = listDueAnkiCardIds({
    sections: activePrismaSections,
    take: 100,
  });

  const [
    allRecordings,
    recentRecordings,
    topics,
    ankiDueRaw,
    ankiDueCards,
    focusTextbook,
    recentWeakFeedback,
  ] = await Promise.all([
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
        unit: true,
        mastery: true,
        errorRate: true,
        lastSeen: true,
        chunks: {
          select: {
            chapterRef: true,
            title: true,
            textbook: { select: { title: true } },
          },
        },
        ankiCards: {
          select: {
            srsState: true,
            reviews: {
              orderBy: { reviewedAt: "desc" },
              take: 1,
              select: {
                rating: true,
                reviewedAt: true,
              },
            },
          },
        },
        questions: {
          select: {
            createdAt: true,
            feedback: {
              select: {
                accountingScore: true,
                combinedScore: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    countDueAnkiCards({ sections: activePrismaSections }),
    dueCardIdsPromise.then((ids) =>
      ids.length > 0
        ? prisma.ankiCard.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              topicId: true,
              section: true,
              topic: {
                select: {
                  id: true,
                  section: true,
                  name: true,
                  mastery: true,
                  errorRate: true,
                },
              },
            },
          })
        : [],
    ),
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
    prisma.feedback.findMany({
      where: { combinedScore: { lt: 7.5 } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        combinedScore: true,
        question: {
          select: {
            id: true,
            recordingId: true,
            section: true,
            topic: {
              select: {
                id: true,
                name: true,
                section: true,
              },
            },
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

  const topicMetrics = topics
    .map((topic) => ({
      topic,
      metrics: computeTopicMasteryMetrics({
        section: String(topic.section),
        storedUnit: topic.unit,
        chunks: topic.chunks,
        cards: topic.ankiCards,
        questions: topic.questions,
        storedLastSeen: topic.lastSeen,
      }),
    }))
    .sort((a, b) => a.metrics.mastery - b.metrics.mastery || b.metrics.cardsDue - a.metrics.cardsDue || a.topic.name.localeCompare(b.topic.name));

  const sectionMap = new Map<string, { topicCount: number; masterySum: number }>();
  for (const { topic, metrics } of topicMetrics) {
    const key = String(topic.section);
    const existing = sectionMap.get(key) ?? { topicCount: 0, masterySum: 0 };
    existing.topicCount++;
    existing.masterySum += metrics.mastery;
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

  const weakestTopics = topicMetrics.slice(0, 5).map(({ topic, metrics }) => ({
    id: topic.id,
    name: topic.name,
    section: String(topic.section),
    mastery: metrics.mastery,
    errorRate: metrics.errorRate != null ? Math.round(metrics.errorRate * 100) : 0,
  }));

  const focusSection =
    focusTextbook?.sections.find((section) => isActiveCpaSection(section) && activeSections.includes(section)) ?? null;
  const currentTextbookFocus = focusTextbook
    ? {
        section: focusSection,
        title: focusTextbook.chunks[0]?.title ?? focusTextbook.chunks[0]?.chapterRef ?? focusTextbook.title,
        detail: `${focusTextbook.title} - chunk ${(focusTextbook.chunks[0]?.order ?? 0) + 1} of ${Math.max(focusTextbook.chunkCount, 1)}`,
        href: `/study/${focusTextbook.id}/${focusTextbook.chunks[0]?.order ?? 0}`,
      }
    : null;

  const weakTopicDrills = topicMetrics.slice(0, 4).map(({ topic, metrics }) => ({
    id: topic.id,
    name: topic.name,
    section: String(topic.section),
    mastery: metrics.mastery,
    errorRate: metrics.errorRate != null ? Math.round(metrics.errorRate * 100) : 0,
    cardsDue: metrics.cardsDue,
    practiceHref: `/anki?topicId=${topic.id}&mode=practice`,
    audioHref: `/anki?topicId=${topic.id}&mode=audio`,
  }));

  const newestWeakFeedback = recentWeakFeedback.find((feedback) => {
    const section = feedback.question.topic?.section ?? feedback.question.section;
    return section != null && isActiveCpaSection(section) && activeSections.includes(section);
  });

  const nextStudyActions: DashboardData["nextStudyActions"] = [];
  if (ankiDueRaw > 0) {
    nextStudyActions.push({
      id: "anki-due",
      title: "Clear due audio cards",
      detail: `${ankiDueRaw} concepts due for review`,
      href: "/anki?mode=audio&dueOnly=true",
      section: ankiDueCards[0]?.section ? String(ankiDueCards[0].section) : null,
      kind: "anki",
    });
  }
  const firstDrill = weakTopicDrills[0];
  if (firstDrill) {
    nextStudyActions.push({
      id: `weak-${firstDrill.id}`,
      title: `Drill ${firstDrill.name}`,
      detail: `${firstDrill.mastery}% mastery with ${firstDrill.errorRate}% error rate`,
      href: firstDrill.audioHref,
      section: firstDrill.section,
      kind: "drill",
    });
  }
  if (newestWeakFeedback) {
    const topicName = newestWeakFeedback.question.topic?.name ?? "recent missed question";
    nextStudyActions.push({
      id: `review-${newestWeakFeedback.question.id}`,
      title: `Review ${topicName}`,
      detail: `${Math.round(newestWeakFeedback.combinedScore * 10) / 10}/10 on the last attempt`,
      href: `/review/${newestWeakFeedback.question.recordingId}`,
      section: newestWeakFeedback.question.topic?.section
        ? String(newestWeakFeedback.question.topic.section)
        : newestWeakFeedback.question.section
          ? String(newestWeakFeedback.question.section)
          : null,
      kind: "review",
    });
  }
  if (currentTextbookFocus) {
    nextStudyActions.push({
      id: "textbook-focus",
      title: currentTextbookFocus.title,
      detail: currentTextbookFocus.detail,
      href: currentTextbookFocus.href,
      section: currentTextbookFocus.section,
      kind: "textbook",
    });
  }

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
    nextStudyActions: nextStudyActions.slice(0, 4),
    weakTopicDrills,
    recentRecordings: recentRecordings.map((recording) => ({
      id: recording.id,
      title: recording.title,
      createdAt: recording.createdAt.toISOString(),
      status: recording.status,
      segmentsCount: recording.segmentsCount,
    })),
    cardsDue: ankiDueRaw,
    currentTextbookFocus,
    routine: null,
  };
}
