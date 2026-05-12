import { ApiError } from "@/lib/api-error";
import { countDueAnkiCards } from "@/lib/anki-due";
import { prisma } from "@/lib/prisma";
import { sanitizeChunkHtml } from "@/lib/textbooks/html-sanitize";

export type RecentTextbook = {
  id: string;
  title: string;
  lastChunkIdx: number;
  totalChunks: number;
} | null;

export type TextbookItem = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
  indexStatus: string;
};

export type StudyData = {
  recentTextbook: RecentTextbook;
  textbooks: TextbookItem[];
  cardsDue: number;
};

export type Textbook = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
};

export type Chunk = {
  id: string;
  order: number;
  title: string | null;
  chapterRef: string | null;
  content: string;
  htmlContent: string | null;
  topicId: string | null;
  fasbCitation: string | null;
};

export type Topic = {
  id: string;
  name: string;
  section: string;
  mastery: number;
} | null;

export type PracticeCard = {
  id: string;
  front: string;
  back: string;
  explanation: string | null;
  sourceCitation: string | null;
  difficulty: number | null;
};

export type ChunkData = {
  textbook: Textbook;
  chunk: Chunk;
  topic: Topic;
  practiceCards: PracticeCard[];
  prevChunkIdx: number | null;
  nextChunkIdx: number | null;
};

export const EMPTY_STUDY_DATA: StudyData = {
  recentTextbook: null,
  textbooks: [],
  cardsDue: 0,
};

export async function readStudyData(): Promise<StudyData> {
  const [textbooks, ankiDue] = await Promise.all([
    prisma.textbook.findMany({
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        title: true,
        sections: true,
        chunkCount: true,
        indexStatus: true,
        indexedAt: true,
      },
    }),
    countDueAnkiCards(),
  ]);

  const recentTextbook = textbooks.find((textbook) => textbook.indexStatus === "READY") ?? null;

  return {
    recentTextbook: recentTextbook
      ? {
          id: recentTextbook.id,
          title: recentTextbook.title,
          lastChunkIdx: 0,
          totalChunks: recentTextbook.chunkCount,
        }
      : null,
    textbooks,
    cardsDue: ankiDue,
  };
}

export async function readStudyChunkData(textbookId: string, chunkId: string): Promise<ChunkData> {
  const order = Number.parseInt(chunkId, 10);

  if (Number.isNaN(order) || order < 0) {
    throw new ApiError("BAD_REQUEST", "chunkId must be a non-negative integer index");
  }

  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: {
      id: true,
      title: true,
      sections: true,
      chunkCount: true,
    },
  });

  if (!textbook) {
    throw new ApiError("NOT_FOUND", `Textbook ${textbookId} not found`);
  }

  const chunk = await prisma.chunk.findFirst({
    where: { textbookId, order },
    select: {
      id: true,
      order: true,
      title: true,
      chapterRef: true,
      content: true,
      htmlContent: true,
      topicId: true,
      fasbCitation: true,
    },
  });

  if (!chunk) {
    throw new ApiError("NOT_FOUND", `Chunk at index ${order} not found for textbook ${textbookId}`);
  }

  const [topic, practiceCards] = await Promise.all([
    chunk.topicId
      ? prisma.topic.findUnique({
          where: { id: chunk.topicId },
          select: {
            id: true,
            name: true,
            section: true,
            mastery: true,
          },
        })
      : null,
    prisma.ankiCard.findMany({
      where: { chunkId: chunk.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        front: true,
        back: true,
        explanation: true,
        sourceCitation: true,
        difficulty: true,
      },
    }),
  ]);

  return {
    textbook,
    chunk: {
      ...chunk,
      htmlContent: chunk.htmlContent ? sanitizeChunkHtml(chunk.htmlContent) : null,
    },
    topic,
    practiceCards,
    prevChunkIdx: order > 0 ? order - 1 : null,
    nextChunkIdx: order < textbook.chunkCount - 1 ? order + 1 : null,
  };
}
