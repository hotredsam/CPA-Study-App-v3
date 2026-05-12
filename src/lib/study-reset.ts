import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export type StudyResetCounts = {
  chatMessages: number;
  conversations: number;
  modelCalls: number;
  batchJobs: number;
  cacheEntries: number;
  ankiReviews: number;
  ankiNotes: number;
  ankiCardsReset: number;
  feedback: number;
  reviewStates: number;
  questions: number;
  stageProgress: number;
  recordings: number;
  studyRoutines: number;
  budgetsReset: number;
  topicsReset: number;
  topicCardDueUpdated: number;
  textbooksPreserved: number;
  chunksPreserved: number;
  topicsPreserved: number;
  ankiCardsPreserved: number;
};

export const preservedLibraryLabels = [
  "textbooks",
  "chunks",
  "topic taxonomy",
  "generated Anki cards",
  "userSettings",
  "openRouterKeyEnc",
  "modelConfig",
  "indexingConfig",
];

function freshSrsState(now: Date): Prisma.JsonObject {
  return {
    ease: 2.5,
    interval: 0,
    nextDue: now.toISOString(),
    lapses: 0,
    repetitions: 0,
  };
}

export async function resetStudyProgressPreservingLibrary(prisma: PrismaClient): Promise<StudyResetCounts> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const counts: StudyResetCounts = {
      chatMessages: 0,
      conversations: 0,
      modelCalls: 0,
      batchJobs: 0,
      cacheEntries: 0,
      ankiReviews: 0,
      ankiNotes: 0,
      ankiCardsReset: 0,
      feedback: 0,
      reviewStates: 0,
      questions: 0,
      stageProgress: 0,
      recordings: 0,
      studyRoutines: 0,
      budgetsReset: 0,
      topicsReset: 0,
      topicCardDueUpdated: 0,
      textbooksPreserved: 0,
      chunksPreserved: 0,
      topicsPreserved: 0,
      ankiCardsPreserved: 0,
    };

    counts.chatMessages = (await tx.chatMessage.deleteMany()).count;
    counts.conversations = (await tx.conversation.deleteMany()).count;
    counts.modelCalls = (await tx.modelCall.deleteMany()).count;
    counts.batchJobs = (await tx.batchJob.deleteMany()).count;
    counts.cacheEntries = (await tx.cacheEntry.deleteMany()).count;
    counts.ankiReviews = (await tx.ankiReview.deleteMany()).count;
    counts.ankiNotes = (await tx.ankiNote.deleteMany()).count;
    counts.feedback = (await tx.feedback.deleteMany()).count;
    counts.reviewStates = (await tx.reviewState.deleteMany()).count;
    counts.questions = (await tx.question.deleteMany()).count;
    counts.stageProgress = (await tx.stageProgress.deleteMany()).count;
    counts.recordings = (await tx.recording.deleteMany()).count;
    counts.studyRoutines = (await tx.studyRoutine.deleteMany()).count;
    counts.budgetsReset = (await tx.budget.updateMany({
      data: {
        currentUsageUsd: 0,
        currentMonthStart: now,
      },
    })).count;

    counts.ankiCardsReset = (await tx.ankiCard.updateMany({
      data: {
        srsState: freshSrsState(now),
        voiceNoteR2Key: null,
      },
    })).count;

    counts.topicsReset = (await tx.topic.updateMany({
      data: {
        mastery: 0,
        errorRate: null,
        cardsDue: 0,
        lastSeen: null,
        notes: null,
        aiNotes: Prisma.JsonNull,
      },
    })).count;

    const topicCardCounts = await tx.ankiCard.groupBy({
      by: ["topicId"],
      where: { topicId: { not: null } },
      _count: { _all: true },
    });

    for (const group of topicCardCounts) {
      if (!group.topicId) continue;
      await tx.topic.update({
        where: { id: group.topicId },
        data: { cardsDue: group._count._all },
      });
      counts.topicCardDueUpdated += 1;
    }

    counts.textbooksPreserved = await tx.textbook.count();
    counts.chunksPreserved = await tx.chunk.count();
    counts.topicsPreserved = await tx.topic.count();
    counts.ankiCardsPreserved = await tx.ankiCard.count();

    return counts;
  });
}
