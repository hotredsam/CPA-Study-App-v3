export type PageText = {
  pageNumber: number;
  text: string;
};

export type TextChunkDraft = {
  order: number;
  chapterRef: string;
  title: string;
  content: string;
};

type WordWithPage = {
  value: string;
  pageNumber: number;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function createTextbookChunkDrafts(args: {
  pages: PageText[];
  chunkSize: number;
  overlapWindow: number;
}): TextChunkDraft[] {
  const chunkSize = Math.max(128, Math.floor(args.chunkSize));
  const overlapWindow = Math.min(
    Math.max(0, Math.floor(args.overlapWindow)),
    Math.max(0, chunkSize - 1),
  );
  const step = Math.max(1, chunkSize - overlapWindow);
  const words: WordWithPage[] = [];

  for (const page of args.pages) {
    const pageWords = normalizeWhitespace(page.text).split(" ").filter(Boolean);
    for (const word of pageWords) {
      words.push({ value: word, pageNumber: page.pageNumber });
    }
  }

  const drafts: TextChunkDraft[] = [];
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + chunkSize);
    if (slice.length < 40 && drafts.length > 0) break;

    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last) continue;

    const pageLabel =
      first.pageNumber === last.pageNumber
        ? `Page ${first.pageNumber}`
        : `Pages ${first.pageNumber}-${last.pageNumber}`;

    drafts.push({
      order: drafts.length,
      chapterRef: pageLabel,
      title: pageLabel,
      content: slice.map((word) => word.value).join(" "),
    });
  }

  return drafts;
}
