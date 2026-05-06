export type CoverageAnkiCard = {
  front: string;
  back: string;
  explanation?: string | null;
  citation?: string | null;
  sourceCitation?: string | null;
};

type SelectCoverageCardsArgs<T extends CoverageAnkiCard> = {
  cards: T[];
  existingCards?: CoverageAnkiCard[];
};

const TECHNICAL_SIGNALS = [
  /\bASC\b/i,
  /\bASU\b/i,
  /\bFASB\b/i,
  /\bGAAP\b/i,
  /\bIFRS\b/i,
  /\bPCAOB\b/i,
  /\bIRC\b/i,
  /\bTreas\./i,
  /§/,
  /\bjournal entr(?:y|ies)\b/i,
  /\bdebit\b/i,
  /\bcredit\b/i,
  /\brecognition\b/i,
  /\bmeasurement\b/i,
  /\bclassification\b/i,
  /\ballocation\b/i,
  /\bdisclosure\b/i,
  /\bthreshold\b/i,
  /\bexception\b/i,
  /\bformula\b/i,
  /\bcalculate\b/i,
  /\bamortization\b/i,
  /\bdepreciation\b/i,
  /\bimpairment\b/i,
  /\bdeferred\b/i,
  /\bfair value\b/i,
  /\bpresent value\b/i,
  /\bcontingenc(?:y|ies)\b/i,
  /\bprobable\b/i,
  /\bOCI\b/i,
  /\bAOCI\b/i,
  /\bconsolidat(?:e|ed|ion)\b/i,
  /\bmateriality\b/i,
  /\bassertion\b/i,
  /\binternal control\b/i,
];

const LOW_VALUE_PATTERNS = [
  /\bwhy (?:do|are) (?:companies|entities|businesses)\b/i,
  /\b(?:important|useful) to (?:users|investors|creditors)\b/i,
  /\bprovide information\b/i,
  /\bhelps users\b/i,
  /\bwhat is the purpose of\b/i,
  /\bwhy is .* important\b/i,
  /\bwhat are financial statements\b/i,
  /\bwhat does .* tell users\b/i,
];

export function normalizeAnkiCoverageText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function ankiCoverageKey(card: CoverageAnkiCard): string {
  return normalizeAnkiCoverageText(card.front);
}

export function isCommonSenseAnkiCard(card: CoverageAnkiCard): boolean {
  const combined = [card.front, card.back, card.explanation ?? ""].join(" ");
  const normalized = normalizeAnkiCoverageText(combined);
  if (normalized.length < 32) return true;

  const hasTechnicalSignal = TECHNICAL_SIGNALS.some((pattern) => pattern.test(combined));
  if (hasTechnicalSignal) return false;

  const lowValueSignalCount = LOW_VALUE_PATTERNS.filter((pattern) => pattern.test(combined)).length;
  const hasCitation = Boolean((card.citation ?? card.sourceCitation)?.trim());
  return lowValueSignalCount > 0 && !hasCitation;
}

export function selectCoverageAnkiCards<T extends CoverageAnkiCard>({
  cards,
  existingCards = [],
}: SelectCoverageCardsArgs<T>): T[] {
  const seen = new Set(existingCards.map(ankiCoverageKey).filter(Boolean));
  const selected: T[] = [];

  for (const card of cards) {
    const key = ankiCoverageKey(card);
    if (!key || seen.has(key) || isCommonSenseAnkiCard(card)) continue;
    seen.add(key);
    selected.push(card);
  }

  return selected;
}
