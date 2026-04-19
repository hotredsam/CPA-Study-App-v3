import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";

// Set env before imports
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";
process.env["R2_ACCOUNT_ID"] = "test-account";
process.env["R2_ACCESS_KEY_ID"] = "test-key";
process.env["R2_SECRET_ACCESS_KEY"] = "test-secret";
process.env["R2_BUCKET_NAME"] = "test-bucket";
process.env["TRIGGER_PROJECT_ID"] = "proj_test123456789";
process.env["TRIGGER_SECRET_KEY"] = "tr_test_secret";

// Mock @/lib/llm/router
vi.mock("@/lib/llm/router", () => ({
  runFunction: vi.fn(),
}));

const { runCheckpointQuiz } = await import("@/lib/ai/checkpoint-quiz");
const { runFunction } = await import("@/lib/llm/router");

const mockRunFunction = vi.mocked(runFunction);

const validThreeQuestions = {
  questions: [
    {
      stem: "Which of the following is a step in ASC 606?",
      choices: [
        "Identify the contract",
        "Estimate the cost",
        "Calculate depreciation",
        "Accrue interest",
      ] as [string, string, string, string],
      correctIndex: 0 as const,
      rationale: "Step 1 of ASC 606 is to identify the contract with a customer.",
      distractorQualityNote: "Options B, C, D are plausible financial tasks but not ASC 606 steps.",
    },
    {
      stem: "Performance obligations are identified in which step of ASC 606?",
      choices: [
        "Step 5",
        "Step 2",
        "Step 4",
        "Step 1",
      ] as [string, string, string, string],
      correctIndex: 1 as const,
      rationale: "Step 2 identifies performance obligations in the contract.",
      distractorQualityNote: "Other steps handle different aspects of revenue recognition.",
    },
    {
      stem: "Transaction price is determined in which step?",
      choices: [
        "Step 1",
        "Step 2",
        "Step 3",
        "Step 5",
      ] as [string, string, string, string],
      correctIndex: 2 as const,
      rationale: "Step 3 of ASC 606 determines the transaction price.",
      distractorQualityNote: "Other steps involve identification, allocation, or recognition.",
    },
  ],
};

describe("runCheckpointQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: returns 3 questions", async () => {
    mockRunFunction.mockResolvedValue({
      output: validThreeQuestions,
      cacheHit: false,
    });

    const result = await runCheckpointQuiz({
      chunkId: "chunk-123",
      content: "ASC 606 is a revenue recognition standard...",
      topicName: "Revenue Recognition",
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0]?.stem).toBeDefined();
    expect(result.questions[0]?.choices).toHaveLength(4);
    expect(result.questions[0]?.correctIndex).toBe(0);
    expect(mockRunFunction).toHaveBeenCalledTimes(1);
  });

  it("Zod failure: throws ZodError when correctIndex is missing", async () => {
    mockRunFunction.mockResolvedValue({
      output: {
        questions: [
          {
            stem: "Which step?",
            choices: ["A", "B", "C", "D"],
            // missing correctIndex
            rationale: "Because...",
            distractorQualityNote: "Note",
          },
        ],
      },
      cacheHit: false,
    });

    await expect(
      runCheckpointQuiz({
        chunkId: "chunk-456",
        content: "Some content",
      }),
    ).rejects.toThrow(ZodError);
  });

  it("Zod failure: throws ZodError when questions array is empty", async () => {
    mockRunFunction.mockResolvedValue({
      output: { questions: [] },
      cacheHit: false,
    });

    await expect(
      runCheckpointQuiz({
        chunkId: "chunk-789",
        content: "Some content",
      }),
    ).rejects.toThrow(ZodError);
  });

  it("Zod failure: throws ZodError when choices has wrong length", async () => {
    mockRunFunction.mockResolvedValue({
      output: {
        questions: [
          {
            stem: "Which step?",
            choices: ["A", "B", "C"], // only 3 choices, needs 4
            correctIndex: 0,
            rationale: "Because...",
            distractorQualityNote: "Note",
          },
        ],
      },
      cacheHit: false,
    });

    await expect(
      runCheckpointQuiz({
        chunkId: "chunk-999",
        content: "Some content",
      }),
    ).rejects.toThrow(ZodError);
  });
});
