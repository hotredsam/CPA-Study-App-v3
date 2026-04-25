import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type DeleteCounts = Record<string, number>;

/**
 * DELETE /api/admin/wipe
 * Deletes study data and local AI bookkeeping while preserving operational
 * settings, model config, and encrypted OpenRouter key material. R2 blobs are
 * intentionally not deleted here.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const counts: DeleteCounts = {};

    await prisma.$transaction(async (tx) => {
      counts.chatMessages = (await tx.chatMessage.deleteMany()).count;
      counts.conversations = (await tx.conversation.deleteMany()).count;
      counts.modelCalls = (await tx.modelCall.deleteMany()).count;
      counts.batchJobs = (await tx.batchJob.deleteMany()).count;
      counts.cacheEntries = (await tx.cacheEntry.deleteMany()).count;
      counts.ankiReviews = (await tx.ankiReview.deleteMany()).count;
      counts.ankiNotes = (await tx.ankiNote.deleteMany()).count;
      counts.ankiCards = (await tx.ankiCard.deleteMany()).count;
      counts.feedback = (await tx.feedback.deleteMany()).count;
      counts.reviewStates = (await tx.reviewState.deleteMany()).count;
      counts.questions = (await tx.question.deleteMany()).count;
      counts.stageProgress = (await tx.stageProgress.deleteMany()).count;
      counts.recordings = (await tx.recording.deleteMany()).count;
      counts.chunks = (await tx.chunk.deleteMany()).count;
      counts.textbooks = (await tx.textbook.deleteMany()).count;
      counts.topics = (await tx.topic.deleteMany()).count;
      counts.studyRoutines = (await tx.studyRoutine.deleteMany()).count;
      counts.budgetsReset = (await tx.budget.updateMany({
        data: {
          currentUsageUsd: 0,
          currentMonthStart: new Date(),
        },
      })).count;
    });

    return NextResponse.json({
      ok: true,
      counts,
      preserved: ["userSettings", "openRouterKeyEnc", "modelConfig", "indexingConfig"],
      note: "Database rows were removed; R2 objects were left in place.",
    });
  } catch (err) {
    return respond(err);
  }
}
