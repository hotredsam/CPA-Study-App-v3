import type { CpaSection, Prisma, Textbook } from "@prisma/client";
import { isActiveCpaSection } from "@/lib/cpa-sections";

export type TextbookWithCount = Textbook & {
  _count?: { chunks: number };
};

export type SerializedTextbook = {
  id: string;
  title: string;
  publisher: string | null;
  sections: CpaSection[];
  pages: number | null;
  chunkCount: number;
  indexStatus: Textbook["indexStatus"];
  sizeBytes: string | null;
  citedCount: number;
  uploadedAt: Date;
  indexedAt: Date | null;
};

export const textbookWithCountInclude = {
  _count: { select: { chunks: true } },
} satisfies Prisma.TextbookInclude;

export function serializeTextbook(textbook: TextbookWithCount): SerializedTextbook {
  return {
    id: textbook.id,
    title: textbook.title,
    publisher: textbook.publisher,
    sections: textbook.sections.filter(isActiveCpaSection),
    pages: textbook.pages,
    chunkCount: textbook._count?.chunks ?? textbook.chunkCount,
    indexStatus: textbook.indexStatus,
    sizeBytes: textbook.sizeBytes?.toString() ?? null,
    citedCount: textbook.citedCount,
    uploadedAt: textbook.uploadedAt,
    indexedAt: textbook.indexedAt,
  };
}
