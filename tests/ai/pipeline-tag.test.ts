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

// Mock @/lib/prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    topic: {
      findFirst: vi.fn(),
    },
    question: {
      update: vi.fn(),
    },
  },
}));

// Mock @/lib/llm/router
vi.mock("@/lib/llm/router", () => ({
  runFunction: vi.fn(),
}));

const { runPipelineTag } = await import("@/lib/ai/pipeline-tag");
const { prisma } = await import("@/lib/prisma");
const { runFunction } = await import("@/lib/llm/router");

const mockRunFunction = vi.mocked(runFunction);
const mockTopicFindFirst = vi.mocked(prisma.topic.findFirst);
const mockQuestionUpdate = vi.mocked(prisma.question.update);

describe("runPipelineTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopicFindFirst.mockResolvedValue(null);
    mockQuestionUpdate.mockResolvedValue({} as ReturnType<typeof prisma.question.update> extends Promise<infer T> ? T : never);
  });

  it("happy path: parses valid output and updates question", async () => {
    const validOutput = {
      section: "FAR",
      unit: "Revenue Recognition",
      topic: "ASC 606 Step 3",
      difficulty: "medium" as const,
    };

    mockRunFunction.mockResolvedValue({
      output: validOutput,
      cacheHit: false,
    });

    const result = await runPipelineTag({
      questionId: "q-123",
      transcript: "This question is about revenue recognition under ASC 606.",
      extractedText: "Which step of ASC 606 addresses performance obligations?",
    });

    expect(result).toEqual(validOutput);
    expect(mockRunFunction).toHaveBeenCalledTimes(1);
    expect(mockQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "q-123" },
        data: expect.objectContaining({
          tags: validOutput,
          taggedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("links topicId when matching Topic exists", async () => {
    const validOutput = {
      section: "FAR",
      unit: "Revenue Recognition",
      topic: "ASC 606 Step 3",
      difficulty: "easy" as const,
    };

    mockRunFunction.mockResolvedValue({ output: validOutput, cacheHit: false });
    mockTopicFindFirst.mockResolvedValue({
      id: "topic-abc",
      section: "FAR",
      name: "ASC 606 Step 3",
      unit: null,
      mastery: 0,
      errorRate: null,
      cardsDue: 0,
      lastSeen: null,
      notes: null,
      aiNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await runPipelineTag({
      questionId: "q-456",
      transcript: null,
      extractedText: "Some extracted text",
    });

    expect(mockQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ topicId: "topic-abc" }),
      }),
    );
  });

  it("Zod failure: throws ZodError when output schema is invalid", async () => {
    mockRunFunction.mockResolvedValue({
      output: { section: "FAR", unit: "Revenue", topic: "Step 3", difficulty: "extreme" },
      cacheHit: false,
    });

    await expect(
      runPipelineTag({
        questionId: "q-789",
        transcript: null,
        extractedText: null,
      }),
    ).rejects.toThrow(ZodError);
  });

  it("Zod failure: throws ZodError when output is missing required fields", async () => {
    mockRunFunction.mockResolvedValue({
      output: { section: "FAR" }, // missing unit, topic, difficulty
      cacheHit: false,
    });

    await expect(
      runPipelineTag({
        questionId: "q-000",
        transcript: null,
        extractedText: null,
      }),
    ).rejects.toThrow(ZodError);
  });
});
