import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  n: z.coerce.number().int().min(1).max(100).default(10),
});

export async function GET(request: NextRequest) {
  try {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);

  if (!parsed.success) {
    throw new ApiError("BAD_REQUEST", "invalid query", parsed.error.flatten());
  }

  const { n } = parsed.data;
  const now = new Date();

  // Questions with a ReviewState due now (or overdue), ordered oldest-due-first
  const due = await prisma.reviewState.findMany({
    where: { nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: "asc" },
    take: n,
    include: {
      question: {
        select: {
          id: true,
          section: true,
          startSec: true,
          endSec: true,
          status: true,
          extracted: true,
          feedback: { select: { combinedScore: true } },
        },
      },
    },
  });

  // Fill remaining slots with "new" questions (never reviewed, done status)
  const remaining = n - due.length;
  const existingIds = due.map((d) => d.questionId);

  const newQuestions =
    remaining > 0
      ? await prisma.question.findMany({
          where: {
            status: "done",
            reviewState: null,
            id: { notIn: existingIds },
          },
          orderBy: { createdAt: "asc" },
          take: remaining,
          select: {
            id: true,
            section: true,
            startSec: true,
            endSec: true,
            status: true,
            extracted: true,
            feedback: { select: { combinedScore: true } },
          },
        })
      : [];

  const dueItems = due.map((d) => ({
    questionId: d.questionId,
    efactor: d.efactor,
    interval: d.interval,
    repetitions: d.repetitions,
    nextReviewAt: d.nextReviewAt,
    isNew: false,
    question: d.question,
  }));

  const newItems = newQuestions.map((q) => ({
    questionId: q.id,
    efactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: now,
    isNew: true,
    question: q,
  }));

  return NextResponse.json({
    items: [...dueItems, ...newItems],
    totalDue: dueItems.length,
    totalNew: newItems.length,
  });
  } catch (err) {
    return respond(err);
  }
}
