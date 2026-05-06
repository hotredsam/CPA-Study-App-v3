import { describe, expect, it } from "vitest";
import { isCommonSenseAnkiCard, selectCoverageAnkiCards } from "./anki-coverage";

describe("Anki coverage selection", () => {
  it("allows zero cards after filtering common-sense prompts", () => {
    const cards = selectCoverageAnkiCards({
      cards: [
        {
          front: "What is the purpose of financial statements?",
          back: "They provide information to users.",
          explanation: "This helps users understand a company.",
          citation: "",
        },
      ],
    });

    expect(cards).toEqual([]);
  });

  it("keeps technical rules, thresholds, and treatments", () => {
    const cards = selectCoverageAnkiCards({
      cards: [
        {
          front: "When is a loss contingency accrued under GAAP?",
          back: "Accrue the loss when it is probable and reasonably estimable.",
          explanation: "This is the recognition threshold for loss contingencies.",
          citation: "ASC 450",
        },
      ],
    });

    expect(cards).toHaveLength(1);
    const card = cards[0];
    if (!card) throw new Error("Expected a selected card");
    expect(isCommonSenseAnkiCard(card)).toBe(false);
  });

  it("deduplicates learning objectives already covered by existing cards", () => {
    const cards = selectCoverageAnkiCards({
      existingCards: [
        {
          front: "When is a loss contingency accrued under GAAP?",
          back: "Probable and reasonably estimable.",
        },
      ],
      cards: [
        {
          front: "When is a loss contingency accrued under GAAP?",
          back: "Accrue when probable and reasonably estimable.",
          explanation: "Duplicate learning objective.",
          citation: "ASC 450",
        },
        {
          front: "How are gain contingencies recognized under GAAP?",
          back: "They are not recognized before realization.",
          explanation: "This is an exception to symmetric contingency treatment.",
          citation: "ASC 450",
        },
      ],
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]?.front).toContain("gain contingencies");
  });
});
