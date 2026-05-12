import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { runAnkiGen } from "@/lib/ai/anki-gen";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  topicId: z.string().min(1),
});

export async function GET() {
  return respond(new ApiError("METHOD_NOT_ALLOWED", "Use POST to regenerate Anki cards."));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = QuerySchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "topicId is required", parsed.error.flatten());
    }

    const { topicId } = parsed.data;

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new ApiError("NOT_FOUND", `Topic not found: ${topicId}`);
    }

    const chunks = await prisma.chunk.findMany({
      where: { topicId },
      orderBy: { order: "asc" },
    });

    const oldCardCount = await prisma.ankiCard.count({ where: { topicId } });
    const nowIso = new Date().toISOString();
    const generatedCards: Array<{
      front: string;
      back: string;
      explanation: string | null;
      sourceCitation: string | null;
      chunkId: string;
      topicId: string;
      section: typeof topic.section;
      difficulty: number | null;
      srsState: {
        ease: number;
        interval: number;
        nextDue: string;
        lapses: number;
        repetitions: number;
      };
    }> = [];

    for (const chunk of chunks) {
      const result = await runAnkiGen({
        chunkId: chunk.id,
        content: chunk.content,
        topicId,
        topicName: topic.name,
        chapterRef: chunk.chapterRef ?? undefined,
        section: topic.section,
        existingCards: generatedCards.map((card) => ({ front: card.front, back: card.back })),
        persist: false,
      });
      generatedCards.push(
        ...result.cards.map((card) => ({
          front: card.front,
          back: card.back,
          explanation: card.explanation,
          sourceCitation: card.citation,
          chunkId: chunk.id,
          topicId,
          section: topic.section,
          difficulty: card.difficulty,
          srsState: {
            ease: 2.5,
            interval: 0,
            nextDue: nowIso,
            lapses: 0,
            repetitions: 0,
          },
        })),
      );
    }

    if (oldCardCount > 0 && generatedCards.length === 0) {
      throw new ApiError("UNPROCESSABLE", "Regeneration produced no replacement cards, so the existing topic deck was kept.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.ankiCard.deleteMany({ where: { topicId } });
      if (generatedCards.length > 0) {
        await tx.ankiCard.createMany({ data: generatedCards });
      }
      await tx.topic.update({
        where: { id: topicId },
        data: { cardsDue: generatedCards.length },
      });
    });

    return NextResponse.json({ count: generatedCards.length, topicId });
  } catch (err) {
    return respond(err);
  }
}
