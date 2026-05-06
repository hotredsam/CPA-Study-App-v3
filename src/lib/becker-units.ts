import { isSupportedCpaSection, type CpaSectionCode } from "@/lib/cpa-sections";

const BECKER_UNIT_PREFIX_BY_SECTION: Record<CpaSectionCode, string> = {
  AUD: "A",
  BAR: "B",
  FAR: "F",
  REG: "R",
  ISC: "S",
  TCP: "T",
};

const PREFIX_TO_SECTION: Record<string, CpaSectionCode> = {
  A: "AUD",
  B: "BAR",
  F: "FAR",
  R: "REG",
  I: "ISC",
  S: "ISC",
  T: "TCP",
};

function candidates(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim() ?? "").filter(Boolean);
}

function expectedPrefix(section: string | null | undefined) {
  return isSupportedCpaSection(section) ? BECKER_UNIT_PREFIX_BY_SECTION[section] : null;
}

function normalizeUnit(prefix: string, value: string) {
  const normalizedPrefix = prefix.toUpperCase();
  const section = PREFIX_TO_SECTION[normalizedPrefix];
  if (!section) return null;
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number <= 0) return null;
  return `${normalizedPrefix}${number}`;
}

function isExpectedUnit(unit: string, section: string | null | undefined) {
  const prefix = expectedPrefix(section);
  return !prefix || unit.startsWith(prefix);
}

export function beckerUnitPrefixForSection(section: string | null | undefined) {
  return expectedPrefix(section) ?? "F";
}

export function inferBeckerUnitLabel(args: {
  textbookTitle?: string | null;
  chapterRef?: string | null;
  title?: string | null;
  section?: string | null;
  content?: string | null;
}) {
  const sectionPrefix = beckerUnitPrefixForSection(args.section);
  const values = candidates([args.chapterRef, args.title, args.textbookTitle, args.content]);

  for (const value of values) {
    const prefixed = /\b([ABFRIST])\s*[-_.]?\s*0?(\d{1,2})(?:\s*[-_.]?\s*M\s*0?\d{1,2})?\b/gi;
    for (const match of value.matchAll(prefixed)) {
      const unit = match[1] && match[2] ? normalizeUnit(match[1], match[2]) : null;
      if (unit && isExpectedUnit(unit, args.section)) return unit;
    }

    const sectionWord = /\b(?:FAR|AUD|REG|BAR|TCP|ISC)\s*[-_.]?\s*0?(\d{1,2})\b/i.exec(value);
    if (sectionWord?.[1]) return `${sectionPrefix}${Number(sectionWord[1])}`;

    const loose = /\b(?:unit|part)\s*0?(\d{1,2})\b/i.exec(value);
    if (loose?.[1]) return `${sectionPrefix}${Number(loose[1])}`;
  }

  return null;
}

export function inferBeckerModuleNumber(text: string) {
  const compact = /\b[ABFRIST]\s*[-_.]?\s*\d{1,2}\s*[-_.]?\s*M\s*0?(\d{1,2})\b/i.exec(text);
  if (compact?.[1]) return Number(compact[1]);

  const moduleMatch = /\bMODULE\s+0?(\d{1,2})\b/i.exec(text);
  if (moduleMatch?.[1]) return Number(moduleMatch[1]);

  const loose = /\bM\s*[-_.]?\s*0?(\d{1,2})\b/i.exec(text);
  return loose?.[1] ? Number(loose[1]) : null;
}

export function inferBeckerModuleLabel(args: {
  textbookTitle?: string | null;
  chapterRef?: string | null;
  title?: string | null;
  section?: string | null;
  content?: string | null;
}) {
  const unit = inferBeckerUnitLabel(args);
  const moduleNumber = inferBeckerModuleNumber(
    candidates([args.chapterRef, args.title, args.content]).join(" "),
  );

  return unit && moduleNumber !== null ? `${unit} M${moduleNumber}` : null;
}
