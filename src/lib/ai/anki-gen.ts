import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const AnkiGenInput = z.object({
  chunkId: z.string(),
  content: z.string(),
  topicId: z.string().optional(),
});

const AnkiCardItem = z.object({
  front: z.string(),
  back: z.string(),
  explanation: z.string(),
  citation: z.string(),
  difficulty: z.number().min(0).max(1),
});

export const AnkiGenOutput = z.object({
  cards: z.array(AnkiCardItem).min(1),
});

export type AnkiGenInput = z.infer<typeof AnkiGenInput>;
export type AnkiGenOutput = z.infer<typeof AnkiGenOutput>;
export type AnkiCardItem = z.infer<typeof AnkiCardItem>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: AnkiGenInput): string {
  const parts: string[] = [
    "Generate 2-5 Anki flashcards from this CPA textbook chunk. Each card should have a front (question/cloze), back (answer), explanation, sourceCitation, and difficulty (0-1 float). Return JSON.",
    "",
    "Chunk Content:",
    input.content,
    "",
    'Return exactly this JSON shape: {"cards":[{"front":"What is...","back":"The answer is...","explanation":"This matters because...","citation":"ASC 606-10-25","difficulty":0.5}]}',
  ];

  return parts.join("\n");
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

  // Create or update AnkiCard rows in DB for each card
  for (const card of output.cards) {
    await prisma.ankiCard.create({
      data: {
        front: card.front,
        back: card.back,
        explanation: card.explanation,
        sourceCitation: card.citation,
        chunkId: validated.chunkId,
        topicId: validated.topicId ?? null,
        difficulty: card.difficulty,
      },
    });
  }

  return output;
}
