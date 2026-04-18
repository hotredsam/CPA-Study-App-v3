import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { schedule, initialState } from "@/lib/sm2";

export const dynamic = "force-dynamic";

const GradeBody = z.object({
  quality: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const { questionId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = GradeBody.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify question exists
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, reviewState: true },
  });

  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const { quality } = parsed.data;
  const prev = question.reviewState
    ? {
        efactor: question.reviewState.efactor,
        interval: question.reviewState.interval,
        repetitions: question.reviewState.repetitions,
      }
    : initialState();

  const next = schedule(prev, quality);

  const reviewState = await prisma.reviewState.upsert({
    where: { questionId },
    create: {
      questionId,
      efactor: next.efactor,
      interval: next.interval,
      repetitions: next.repetitions,
      nextReviewAt: next.nextReviewAt,
      lastReviewedAt: new Date(),
    },
    update: {
      efactor: next.efactor,
      interval: next.interval,
      repetitions: next.repetitions,
      nextReviewAt: next.nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  return NextResponse.json({
    questionId,
    quality,
    efactor: reviewState.efactor,
    interval: reviewState.interval,
    repetitions: reviewState.repetitions,
    nextReviewAt: reviewState.nextReviewAt,
  });
}
