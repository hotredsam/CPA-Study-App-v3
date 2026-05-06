import { z } from "zod";
import { AiFunctionKey, CpaSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";
import { selectCoverageAnkiCards, type CoverageAnkiCard } from "./anki-coverage";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const AnkiGenInput = z.object({
  chunkId: z.string(),
  content: z.string(),
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  chapterRef: z.string().optional(),
  section: z.nativeEnum(CpaSection).optional(),
  existingCards: z.array(z.object({ front: z.string(), back: z.string() })).optional(),
});

const AnkiCardItem = z.object({
  front: z.string(),
  back: z.string(),
  explanation: z.string(),
  citation: z.string(),
  difficulty: z.number().min(0).max(1),
});

export const AnkiGenOutput = z.object({
  cards: z.array(AnkiCardItem).max(12),
});

export type AnkiGenInput = z.infer<typeof AnkiGenInput>;
export type AnkiGenOutput = z.infer<typeof AnkiGenOutput>;
export type AnkiCardItem = z.infer<typeof AnkiCardItem>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: AnkiGenInput): string {
  const parts: string[] = [
    "Generate Anki flashcards from this CPA textbook chunk only when they are needed for full topic coverage.",
    "There is no quota. Return zero cards when the chunk is a table of contents, introductory prose, repeated material, or common-sense business context.",
    "Create cards only for non-obvious, exam-useful learning objectives: rules, exceptions, thresholds, formulas, journal-entry treatment, measurement/classification decisions, disclosure requirements, tax/audit procedures, and common CPA exam pitfalls.",
    "Do not create cards for common-sense items such as why financial statements are useful, why investors need information, or generic definitions that a reasonable business student already knows.",
    "Deduplicate by learning objective. If an existing card already covers the point, skip it.",
    "Use as many cards as the chunk truly needs for coverage, including zero; do not pad the deck.",
    "Each card should have a front question or cloze, back answer, explanation, citation, and difficulty from 0 to 1. Return JSON.",
    "",
  ];

  if (input.section) parts.push(`CPA Section: ${input.section}`);
  if (input.topicName) parts.push(`Topic: ${input.topicName}`);
  if (input.chapterRef) parts.push(`Chunk reference: ${input.chapterRef}`);

  if (input.existingCards && input.existingCards.length > 0) {
    parts.push(
      "",
      "Already-covered card fronts for this topic/chunk:",
      ...input.existingCards.slice(0, 24).map((card) => `- ${card.front}`),
      "",
    );
  }

  parts.push(
    "Chunk Content:",
    input.content,
    "",
    'Return exactly this JSON shape: {"cards":[{"front":"What is...","back":"The answer is...","explanation":"This matters because...","citation":"ASC 606-10-25","difficulty":0.5}]}',
    'If no cards are needed, return {"cards":[]}.',
  );

  return parts.join("\n");
}

async function loadExistingCards(input: AnkiGenInput): Promise<CoverageAnkiCard[]> {
  if (input.existingCards) return input.existingCards;

  const where = input.topicId
    ? { topicId: input.topicId }
    : { chunkId: input.chunkId };

  return prisma.ankiCard.findMany({
    where,
    select: {
      front: true,
      back: true,
      explanation: true,
      sourceCitation: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runAnkiGen(input: AnkiGenInput): Promise<AnkiGenOutput> {
  const validated = AnkiGenInput.parse(input);

  const result = await runFunction(AiFunctionKey.ANKI_GEN, {
    prompt: buildPrompt(validated),
    chunkId: validated.chunkId,
  });

  const output = AnkiGenOutput.parse(result.output);
  const existingCards = await loadExistingCards(validated);
  const coverageCards = selectCoverageAnkiCards({
    cards: output.cards,
    existingCards,
  });

  // Create or update AnkiCard rows in DB for each card
  for (const card of coverageCards) {
    await prisma.ankiCard.create({
      data: {
        front: card.front,
        back: card.back,
        explanation: card.explanation,
        sourceCitation: card.citation,
        chunkId: validated.chunkId,
        topicId: validated.topicId ?? null,
        section: validated.section ?? null,
        difficulty: card.difficulty,
      },
    });
  }

  return { cards: coverageCards };
}
