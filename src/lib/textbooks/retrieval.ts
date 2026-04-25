import { CpaSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RetrievedTextbookChunk = {
  chunkId: string;
  textbookId: string;
  textbookTitle: string;
  citation: string;
  content: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "becker",
  "between",
  "choice",
  "correct",
  "could",
  "during",
  "explain",
  "following",
  "from",
  "have",
  "into",
  "question",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "under",
  "what",
  "when",
  "which",
  "with",
  "would",
]);

function candidateTerms(text: string): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []) {
    const term = raw.replace(/^-+|-+$/g, "");
    if (term.length < 4 || STOP_WORDS.has(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([term]) => term);
}

function scoreContent(content: string, terms: string[]): number {
  const lower = content.toLowerCase();
  return terms.reduce((score, term) => {
    const matches = lower.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"));
    return score + (matches?.length ?? 0);
  }, 0);
}

function sectionOrUndefined(section: string | null | undefined): CpaSection | undefined {
  const values = Object.values(CpaSection) as string[];
  return section && values.includes(section) ? (section as CpaSection) : undefined;
}

export async function retrieveTextbookChunksForQuestion(args: {
  question: string;
  choices: { label: string; text: string }[];
  beckerExplanation: string | null;
  section: string | null;
  limit?: number;
}): Promise<RetrievedTextbookChunk[]> {
  const queryText = [
    args.question,
    args.choices.map((choice) => choice.text).join(" "),
    args.beckerExplanation ?? "",
  ].join(" ");
  const terms = candidateTerms(queryText);
  if (terms.length === 0) return [];

  const section = sectionOrUndefined(args.section);
  const chunks = await prisma.chunk.findMany({
    where: {
      ...(section
        ? {
            textbook: {
              sections: { has: section },
              indexStatus: "READY",
            },
          }
        : {
            textbook: {
              indexStatus: "READY",
            },
          }),
      OR: terms.map((term) => ({ content: { contains: term, mode: "insensitive" as const } })),
    },
    take: 60,
    select: {
      id: true,
      order: true,
      chapterRef: true,
      title: true,
      content: true,
      textbookId: true,
      textbook: {
        select: {
          title: true,
        },
      },
    },
  });

  return chunks
    .map((chunk) => ({
      chunk,
      score: scoreContent(chunk.content, terms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, args.limit ?? 3)
    .map(({ chunk }) => ({
      chunkId: chunk.id,
      textbookId: chunk.textbookId,
      textbookTitle: chunk.textbook.title,
      citation: `${chunk.textbook.title} - ${chunk.title ?? chunk.chapterRef ?? `Chunk ${chunk.order + 1}`}`,
      content: chunk.content.slice(0, 1800),
    }));
}
