import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AiFunctionKey, type Prisma } from "@prisma/client";

// Set ENCRYPTION_KEY before any imports
process.env["ENCRYPTION_KEY"] = "b".repeat(64);

// Mock @/lib/prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelConfig: {
      findUnique: vi.fn(),
    },
    budget: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    cacheEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    batchJob: {
      create: vi.fn(),
    },
    modelCall: {
      create: vi.fn(),
    },
  },
}));

// Mock @/lib/llm/openrouter
vi.mock("@/lib/llm/openrouter", () => ({
  callOpenRouter: vi.fn(),
}));

// Mock @/lib/claude-cli
vi.mock("@/lib/claude-cli", () => ({
  callClaude: vi.fn(),
}));

// Mock logger to silence output in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { runFunction } = await import("@/lib/llm/router");
const { prisma } = await import("@/lib/prisma");
const { callOpenRouter } = await import("@/lib/llm/openrouter");

// Typed mock helpers
const mockModelConfig = vi.mocked(prisma.modelConfig.findUnique);
const mockBudgetFind = vi.mocked(prisma.budget.findFirst);
const mockBudgetUpdate = vi.mocked(prisma.budget.update);
const mockCacheFind = vi.mocked(prisma.cacheEntry.findUnique);
const mockCacheUpdate = vi.mocked(prisma.cacheEntry.update);
const mockCacheUpsert = vi.mocked(prisma.cacheEntry.upsert);
const mockBatchCreate = vi.mocked(prisma.batchJob.create);
const mockModelCallCreate = vi.mocked(prisma.modelCall.create);
const mockCallOpenRouter = vi.mocked(callOpenRouter);

function makeModelConfig(overrides: Partial<{
  functionKey: AiFunctionKey;
  model: string;
  batchEnabled: boolean;
  cacheEnabled: boolean;
  useOAuthFallback: boolean;
}> = {}) {
  return {
    id: "config-1",
    functionKey: AiFunctionKey.PIPELINE_GRADE,
    model: "anthropic/claude-3-5-sonnet",
    batchEnabled: false,
    cacheEnabled: true,
    useOAuthFallback: false,
    interestLevel: null,
    downtimeTolerance: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeBudget(overrides: Partial<{
  hardStop: boolean;
  monthlyCapUsd: number;
  currentUsageUsd: number;
  autoDegrade: boolean;
  warnThreshold: number;
}> = {}) {
  return {
    id: "budget-1",
    monthlyCapUsd: 50,
    warnThreshold: 0.8,
    autoDegrade: true,
    hardStop: false,
    currentUsageUsd: 0,
    currentMonthStart: new Date(),
    rolloverEnabled: false,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCacheEntry(output: Prisma.JsonValue = { score: 9 }) {
  return {
    id: "cache-1",
    functionKey: AiFunctionKey.PIPELINE_GRADE,
    inputHash: "somehash",
    embedding: null,
    output,
    hitCount: 3,
    precision: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

describe("runFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default budget — no issues
    mockBudgetFind.mockResolvedValue(makeBudget());
    // Default: no cache hit
    mockCacheFind.mockResolvedValue(null);
    // Default: model call create succeeds
    mockModelCallCreate.mockResolvedValue({
      id: "call-1",
      functionKey: AiFunctionKey.PIPELINE_GRADE,
      model: "anthropic/claude-3-5-sonnet",
      inputTokens: 10,
      outputTokens: 20,
      usdCost: 0.00005,
      cacheHit: false,
      batchJobId: null,
      createdAt: new Date(),
    });
    // Default: cache upsert succeeds
    mockCacheUpsert.mockResolvedValue(makeCacheEntry());
    // Default: budget update succeeds
    mockBudgetUpdate.mockResolvedValue(makeBudget({ currentUsageUsd: 0.00005 }));
    // Default: callOpenRouter returns something useful
    mockCallOpenRouter.mockResolvedValue({
      content: '{"answer":"Revenue is recognized..."}',
      inputTokens: 10,
      outputTokens: 20,
      usdCost: 0.00005,
      model: "anthropic/claude-3-5-sonnet",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when ModelConfig not found", async () => {
    mockModelConfig.mockResolvedValue(null);

    await expect(
      runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" }),
    ).rejects.toThrow(/ModelConfig not found for functionKey/);
  });

  it("throws when budget hardStop is true and cap reached", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());
    mockBudgetFind.mockResolvedValue(
      makeBudget({ hardStop: true, monthlyCapUsd: 50, currentUsageUsd: 50 }),
    );

    await expect(
      runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" }),
    ).rejects.toThrow("Budget hard stop: monthly cap reached");
  });

  it("returns cached output without calling callOpenRouter on cache hit", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());
    const cachedOutput = { score: 9, explanation: "great answer" };
    mockCacheFind.mockResolvedValue(makeCacheEntry(cachedOutput));
    mockCacheUpdate.mockResolvedValue({
      ...makeCacheEntry(cachedOutput),
      hitCount: 4,
    });

    const result = await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(result.cacheHit).toBe(true);
    expect(result.output).toEqual(cachedOutput);
    expect(mockCallOpenRouter).not.toHaveBeenCalled();
  });

  it("enqueues BatchJob and returns batchJobId when batchEnabled=true", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig({ batchEnabled: true }));
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    mockBatchCreate.mockResolvedValue({
      id: "batch-job-1",
      functionKey: AiFunctionKey.PIPELINE_GRADE,
      payload: { prompt: "test" },
      status: "QUEUED",
      coalesceWindowStart: now,
      coalesceWindowEnd: windowEnd,
      offPeakPreferred: false,
      createdAt: now,
      completedAt: null,
      resultId: null,
    });

    const result = await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(result.cacheHit).toBe(false);
    expect(result.batchJobId).toBe("batch-job-1");
    expect(result.output).toBeNull();
    expect(result.expectedCompletionAt).toBeInstanceOf(Date);
    expect(mockCallOpenRouter).not.toHaveBeenCalled();
  });

  it("bypasses batch when bypassBatch=true", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig({ batchEnabled: true }));

    const result = await runFunction(
      AiFunctionKey.PIPELINE_GRADE,
      { prompt: "test" },
      { bypassBatch: true },
    );

    expect(result.batchJobId).toBeUndefined();
    expect(mockCallOpenRouter).toHaveBeenCalledTimes(1);
    expect(mockBatchCreate).not.toHaveBeenCalled();
  });

  it("auto-degrades PIPELINE_GRADE from sonnet to haiku when budget > warnThreshold", async () => {
    mockModelConfig.mockResolvedValue(
      makeModelConfig({ model: "anthropic/claude-3-5-sonnet" }),
    );
    mockBudgetFind.mockResolvedValue(
      makeBudget({
        autoDegrade: true,
        warnThreshold: 0.8,
        monthlyCapUsd: 50,
        currentUsageUsd: 45, // 45/50 = 90% > 80%
      }),
    );

    await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(mockCallOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ model: "anthropic/claude-haiku-4.5" }),
    );
  });

  it("auto-degrades CHECKPOINT_QUIZ from sonnet to haiku when budget > warnThreshold", async () => {
    mockModelConfig.mockResolvedValue(
      makeModelConfig({
        functionKey: AiFunctionKey.CHECKPOINT_QUIZ,
        model: "anthropic/claude-3-5-sonnet",
      }),
    );
    mockBudgetFind.mockResolvedValue(
      makeBudget({
        autoDegrade: true,
        warnThreshold: 0.8,
        monthlyCapUsd: 50,
        currentUsageUsd: 45,
      }),
    );

    await runFunction(AiFunctionKey.CHECKPOINT_QUIZ, { prompt: "test" });

    expect(mockCallOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ model: "anthropic/claude-haiku-4.5" }),
    );
  });

  it("does NOT degrade PIPELINE_SEGMENT even when budget > warnThreshold", async () => {
    mockModelConfig.mockResolvedValue(
      makeModelConfig({
        functionKey: AiFunctionKey.PIPELINE_SEGMENT,
        model: "anthropic/claude-3-5-sonnet",
      }),
    );
    mockBudgetFind.mockResolvedValue(
      makeBudget({
        autoDegrade: true,
        warnThreshold: 0.8,
        monthlyCapUsd: 50,
        currentUsageUsd: 45,
      }),
    );

    await runFunction(AiFunctionKey.PIPELINE_SEGMENT, { prompt: "test" });

    expect(mockCallOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ model: "anthropic/claude-3-5-sonnet" }),
    );
  });

  it("calls callOpenRouter and returns parsed JSON output", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());

    const result = await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(result.cacheHit).toBe(false);
    expect(result.output).toEqual({ answer: "Revenue is recognized..." });
    expect(mockModelCallCreate).toHaveBeenCalledTimes(1);
  });

  it("returns raw string output when response is not valid JSON", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());
    mockCallOpenRouter.mockResolvedValueOnce({
      content: "This is plain text, not JSON",
      inputTokens: 5,
      outputTokens: 10,
      usdCost: 0.00001,
      model: "anthropic/claude-3-5-sonnet",
    });

    const result = await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(result.output).toBe("This is plain text, not JSON");
  });

  it("writes cache entry when cacheEnabled=true", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig({ cacheEnabled: true }));

    await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(mockCacheUpsert).toHaveBeenCalledTimes(1);
  });

  it("skips cache write when cacheEnabled=false", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig({ cacheEnabled: false }));

    await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(mockCacheUpsert).not.toHaveBeenCalled();
  });

  it("increments budget currentUsageUsd atomically", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());

    await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" });

    expect(mockBudgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "budget-1" },
        data: { currentUsageUsd: { increment: 0.00005 } },
      }),
    );
  });

  it("bypasses cache lookup when bypassCache=true", async () => {
    mockModelConfig.mockResolvedValue(makeModelConfig());
    // Even if cache has an entry, it should be ignored
    mockCacheFind.mockResolvedValue(makeCacheEntry());

    await runFunction(AiFunctionKey.PIPELINE_GRADE, { prompt: "test" }, { bypassCache: true });

    expect(mockCacheFind).not.toHaveBeenCalled();
    expect(mockCallOpenRouter).toHaveBeenCalledTimes(1);
  });
});
