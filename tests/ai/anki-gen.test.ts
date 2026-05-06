import { describe, expect, it, vi, beforeEach } from "vitest";

process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ankiCard: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm/router", () => ({
  runFunction: vi.fn(),
}));

const { runAnkiGen } = await import("@/lib/ai/anki-gen");
const { prisma } = await import("@/lib/prisma");
const { runFunction } = await import("@/lib/llm/router");

const mockRunFunction = vi.mocked(runFunction);
const mockFindMany = vi.mocked(prisma.ankiCard.findMany);
const mockCreate = vi.mocked(prisma.ankiCard.create);

function latestPrompt(): string {
  const payload = mockRunFunction.mock.calls.at(-1)?.[1];
  if (payload !== null && typeof payload === "object" && "prompt" in payload) {
    const prompt = payload.prompt;
    if (typeof prompt === "string") return prompt;
  }
  throw new Error("Prompt payload was not captured");
}

describe("runAnkiGen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCreate.mockResolvedValue({} as Awaited<ReturnType<typeof prisma.ankiCard.create>>);
  });

  it("does not require a fixed card count", async () => {
    mockRunFunction.mockResolvedValue({
      output: { cards: [] },
      cacheHit: false,
    });

    const result = await runAnkiGen({
      chunkId: "chunk-1",
      content: "This chunk is only a table of contents.",
      topicName: "Financial Reporting",
    });

    expect(result.cards).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(latestPrompt()).toContain("There is no quota");
    expect(latestPrompt()).not.toContain("2-5");
  });

  it("filters common-sense cards and keeps technical coverage", async () => {
    mockRunFunction.mockResolvedValue({
      output: {
        cards: [
          {
            front: "What is the purpose of financial statements?",
            back: "They provide information to users.",
            explanation: "This is general context.",
            citation: "",
            difficulty: 0.1,
          },
          {
            front: "When is a loss contingency accrued under GAAP?",
            back: "When the loss is probable and reasonably estimable.",
            explanation: "This is the ASC 450 recognition threshold.",
            citation: "ASC 450",
            difficulty: 0.62,
          },
        ],
      },
      cacheHit: false,
    });

    const result = await runAnkiGen({
      chunkId: "chunk-2",
      content: "Loss contingencies are accrued when probable and reasonably estimable.",
      topicId: "topic-1",
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.front).toContain("loss contingency");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("deduplicates cards already covering the same learning objective", async () => {
    const existingCards = [
      {
        front: "When is a loss contingency accrued under GAAP?",
        back: "Probable and reasonably estimable.",
        explanation: null,
        sourceCitation: "ASC 450",
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.ankiCard.findMany>>;
    mockFindMany.mockResolvedValue(existingCards);
    mockRunFunction.mockResolvedValue({
      output: {
        cards: [
          {
            front: "When is a loss contingency accrued under GAAP?",
            back: "When probable and reasonably estimable.",
            explanation: "Duplicate.",
            citation: "ASC 450",
            difficulty: 0.6,
          },
          {
            front: "How are gain contingencies recognized under GAAP?",
            back: "They are not recognized before realization.",
            explanation: "This is a common CPA exam contrast with loss contingencies.",
            citation: "ASC 450",
            difficulty: 0.55,
          },
        ],
      },
      cacheHit: false,
    });

    const result = await runAnkiGen({
      chunkId: "chunk-3",
      content: "Gain contingencies are not recognized before realization.",
      topicId: "topic-1",
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.front).toContain("gain contingencies");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
