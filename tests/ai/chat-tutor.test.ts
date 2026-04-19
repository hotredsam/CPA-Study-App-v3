import { describe, it, expect, vi, beforeEach } from "vitest";

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
    conversation: {
      create: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    question: {
      findUnique: vi.fn(),
    },
    topic: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock @/lib/llm/router
vi.mock("@/lib/llm/router", () => ({
  runFunction: vi.fn(),
}));

const { runChatTutor } = await import("@/lib/ai/chat-tutor");
const { prisma } = await import("@/lib/prisma");
const { runFunction } = await import("@/lib/llm/router");

const mockRunFunction = vi.mocked(runFunction);
const mockConversationCreate = vi.mocked(prisma.conversation.create);
const mockChatMessageFindMany = vi.mocked(prisma.chatMessage.findMany);
const mockChatMessageCreate = vi.mocked(prisma.chatMessage.create);
const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockTopicFindUnique = vi.mocked(prisma.topic.findUnique);

function makeConversation(id = "conv-123") {
  return {
    id,
    scope: "ANKI" as const,
    scopeId: "general",
    createdAt: new Date(),
  };
}

describe("runChatTutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatMessageFindMany.mockResolvedValue([]);
    mockChatMessageCreate.mockResolvedValue({} as ReturnType<typeof prisma.chatMessage.create> extends Promise<infer T> ? T : never);
    mockQuestionFindUnique.mockResolvedValue(null);
    mockTopicFindUnique.mockResolvedValue(null);
    mockRunFunction.mockResolvedValue({
      output: "Revenue under ASC 606 is recognized when performance obligations are met.",
      cacheHit: false,
    });
  });

  it("happy path: returns reply and conversationId", async () => {
    mockConversationCreate.mockResolvedValue(makeConversation("conv-abc"));

    const result = await runChatTutor({
      message: "Explain revenue recognition.",
    });

    expect(result.reply).toBeTruthy();
    expect(result.conversationId).toBe("conv-abc");
    expect(mockRunFunction).toHaveBeenCalledTimes(1);
    expect(mockChatMessageCreate).toHaveBeenCalledTimes(2); // user + assistant
  });

  it("uses existing conversationId when provided", async () => {
    const result = await runChatTutor({
      conversationId: "conv-existing",
      message: "What is step 3 of ASC 606?",
    });

    expect(result.conversationId).toBe("conv-existing");
    // Should NOT create a new conversation
    expect(mockConversationCreate).not.toHaveBeenCalled();
  });

  it("new conversation created if no conversationId provided", async () => {
    mockConversationCreate.mockResolvedValue(makeConversation("conv-new"));

    const result = await runChatTutor({
      message: "What is ASC 606?",
    });

    expect(mockConversationCreate).toHaveBeenCalledTimes(1);
    expect(result.conversationId).toBe("conv-new");
  });

  it("creates REVIEW scope conversation when questionId provided", async () => {
    mockConversationCreate.mockResolvedValue({
      ...makeConversation("conv-review"),
      scope: "REVIEW" as const,
      scopeId: "q-123",
    });

    await runChatTutor({
      message: "Why is this answer wrong?",
      context: { questionId: "q-123" },
    });

    expect(mockConversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: "REVIEW",
          scopeId: "q-123",
        }),
      }),
    );
  });

  it("creates STUDY scope conversation when topicId provided", async () => {
    mockConversationCreate.mockResolvedValue({
      ...makeConversation("conv-study"),
      scope: "STUDY" as const,
      scopeId: "topic-far",
    });

    await runChatTutor({
      message: "Explain this topic.",
      context: { topicId: "topic-far" },
    });

    expect(mockConversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: "STUDY",
          scopeId: "topic-far",
        }),
      }),
    );
  });
});
