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

function unitPrefixForSection(section: string | undefined): string {
  switch (section) {
    case "AUD":
      return "A";
    case "REG":
      return "R";
    case "TCP":
      return "T";
    case "BAR":
      return "B";
    case "ISC":
      return "I";
    case "FAR":
    default:
      return "F";
  }
}

function inferUnitLabel(args: {
  textbookTitle?: string;
  section?: string;
}): string | null {
  const title = args.textbookTitle ?? "";
  const sectionPrefix = unitPrefixForSection(args.section);
  const direct = new RegExp(`\\b${sectionPrefix}\\s*0?(\\d{1,2})\\b`, "i").exec(title);
  if (direct?.[1]) return `${sectionPrefix}${Number(direct[1])}`;

  const farFile = /\bFAR[-_\s]*0?(\d{1,2})\b/i.exec(title);
  if (farFile?.[1]) return `F${Number(farFile[1])}`;

  const loose = /\b(?:unit|part)\s*0?(\d{1,2})\b/i.exec(title);
  return loose?.[1] ? `${sectionPrefix}${Number(loose[1])}` : null;
}

function inferModuleNumber(content: string): number | null {
  const moduleMatch = /\bMODULE\s+0?(\d{1,2})\b/i.exec(content);
  if (moduleMatch?.[1]) return Number(moduleMatch[1]);

  const compactMatch = /\bM\s*[-.]?\s*0?(\d{1,2})\b/i.exec(content);
  return compactMatch?.[1] ? Number(compactMatch[1]) : null;
}

export function createTextbookChunkDrafts(args: {
  pages: PageText[];
  chunkSize: number;
  overlapWindow: number;
  textbookTitle?: string;
  section?: string;
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
  const unitLabel = inferUnitLabel({
    textbookTitle: args.textbookTitle,
    section: args.section,
  });
  let currentModule: number | null = null;

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
    const content = slice.map((word) => word.value).join(" ");
    const moduleNumber = inferModuleNumber(content);
    if (moduleNumber !== null) {
      currentModule = moduleNumber;
    }

    const moduleLabel = unitLabel && currentModule !== null ? `${unitLabel} M${currentModule}` : null;
    const displayTitle = moduleLabel ? `${moduleLabel} - ${pageLabel}` : pageLabel;

    drafts.push({
      order: drafts.length,
      chapterRef: moduleLabel ? `${moduleLabel} - ${pageLabel}` : pageLabel,
      title: displayTitle,
      content,
    });
  }

  return drafts;
}
