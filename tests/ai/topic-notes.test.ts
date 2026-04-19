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
      update: vi.fn(),
    },
  },
}));

// Mock @/lib/llm/router
vi.mock("@/lib/llm/router", () => ({
  runFunction: vi.fn(),
}));

const { runTopicNotes } = await import("@/lib/ai/topic-notes");
const { prisma } = await import("@/lib/prisma");
const { runFunction } = await import("@/lib/llm/router");

const mockRunFunction = vi.mocked(runFunction);
const mockTopicUpdate = vi.mocked(prisma.topic.update);

describe("runTopicNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopicUpdate.mockResolvedValue({} as ReturnType<typeof prisma.topic.update> extends Promise<infer T> ? T : never);
  });

  it("happy path: all 4 fields present and Topic.aiNotes is written", async () => {
    const validOutput = {
      coreRule: "Revenue is recognized when performance obligations are satisfied.",
      pitfall: "Students often confuse the allocation step with the recognition step.",
      citation: "ASC 606-10-25",
      performance:
        "This topic appears as 3-5 MCQs and 1-2 TBSs per FAR exam section.",
    };

    mockRunFunction.mockResolvedValue({
      output: validOutput,
      cacheHit: false,
    });

    const result = await runTopicNotes({
      topicId: "topic-123",
      topicName: "ASC 606 Revenue Recognition",
    });

    expect(result.coreRule).toBe(validOutput.coreRule);
    expect(result.pitfall).toBe(validOutput.pitfall);
    expect(result.citation).toBe(validOutput.citation);
    expect(result.performance).toBe(validOutput.performance);

    expect(mockTopicUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "topic-123" },
        data: expect.objectContaining({
          aiNotes: validOutput,
        }),
      }),
    );
  });

  it("Zod failure: throws ZodError when required field is missing", async () => {
    mockRunFunction.mockResolvedValue({
      output: {
        coreRule: "Revenue recognized when obligations met.",
        pitfall: "Common mistake here.",
        // missing citation and performance
      },
      cacheHit: false,
    });

    await expect(
      runTopicNotes({
        topicId: "topic-456",
        topicName: "Revenue Recognition",
      }),
    ).rejects.toThrow(ZodError);
  });
});
