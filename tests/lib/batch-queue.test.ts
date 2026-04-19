import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    batchJob: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { enqueue, getQueueSummary } = await import("@/lib/batch/queue");
const { prisma } = await import("@/lib/prisma");

const mockCreate = vi.mocked(prisma.batchJob.create);
const mockFindMany = vi.mocked(prisma.batchJob.findMany);

function makeBatchJob(overrides: Partial<{
  id: string;
  functionKey: string;
  coalesceWindowEnd: Date | null;
}> = {}) {
  const now = new Date();
  const end = new Date(now.getTime() + 6 * 3600 * 1000);
  return {
    id: "job-1",
    functionKey: "PIPELINE_GRADE",
    payload: {},
    status: "QUEUED" as const,
    coalesceWindowStart: now,
    coalesceWindowEnd: end,
    offPeakPreferred: false,
    createdAt: now,
    completedAt: null,
    resultId: null,
    ...overrides,
  };
}

describe("enqueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a BatchJob row with QUEUED status", async () => {
    const job = makeBatchJob();
    mockCreate.mockResolvedValue(job);

    const result = await enqueue("PIPELINE_GRADE", { prompt: "test" });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          functionKey: "PIPELINE_GRADE",
          status: "QUEUED",
        }),
      }),
    );
    expect(result.jobId).toBe("job-1");
    expect(result.expectedCompletionAt).toBeInstanceOf(Date);
  });

  it("uses default 6-hour coalesce window", async () => {
    const before = Date.now();
    const job = makeBatchJob();
    mockCreate.mockResolvedValue(job);

    await enqueue("PIPELINE_GRADE", { prompt: "test" });

    const call = mockCreate.mock.calls[0]?.[0];
    const windowEnd = call?.data?.coalesceWindowEnd as Date;
    const windowStart = call?.data?.coalesceWindowStart as Date;

    const diff = windowEnd.getTime() - windowStart.getTime();
    const expectedMs = 6 * 3600 * 1000;
    // Allow 1 second tolerance for test execution time
    expect(diff).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(diff).toBeLessThanOrEqual(expectedMs + 1000);
    expect(before).toBeLessThanOrEqual(windowStart.getTime() + 1000);
  });

  it("sets offPeakPreferred flag correctly", async () => {
    mockCreate.mockResolvedValue(makeBatchJob());

    await enqueue("PIPELINE_GRADE", {}, 3600, true);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ offPeakPreferred: true }),
      }),
    );
  });

  it("uses custom coalesce window when provided", async () => {
    mockCreate.mockResolvedValue(makeBatchJob());

    await enqueue("PIPELINE_GRADE", {}, 3600);

    const call = mockCreate.mock.calls[0]?.[0];
    const windowEnd = call?.data?.coalesceWindowEnd as Date;
    const windowStart = call?.data?.coalesceWindowStart as Date;
    const diff = windowEnd.getTime() - windowStart.getTime();

    expect(diff).toBeCloseTo(3600 * 1000, -2);
  });
});

describe("getQueueSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no queued jobs", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getQueueSummary();
    expect(result).toEqual([]);
  });

  it("groups jobs by functionKey with correct counts", async () => {
    const now = new Date();
    const end1 = new Date(now.getTime() + 1000);
    const end2 = new Date(now.getTime() + 2000);

    mockFindMany.mockResolvedValue([
      makeBatchJob({ id: "j1", functionKey: "PIPELINE_GRADE", coalesceWindowEnd: end1 }),
      makeBatchJob({ id: "j2", functionKey: "PIPELINE_GRADE", coalesceWindowEnd: end2 }),
      makeBatchJob({ id: "j3", functionKey: "ANKI_GEN", coalesceWindowEnd: end1 }),
    ]);

    const result = await getQueueSummary();

    expect(result).toHaveLength(2);

    const gradeRow = result.find((r) => r.functionKey === "PIPELINE_GRADE");
    const ankiRow = result.find((r) => r.functionKey === "ANKI_GEN");

    expect(gradeRow?.queued).toBe(2);
    expect(ankiRow?.queued).toBe(1);
    // nextRunAt should be the minimum coalesceWindowEnd
    expect(gradeRow?.nextRunAt).toEqual(end1);
    expect(ankiRow?.nextRunAt).toEqual(end1);
  });

  it("returns nextRunAt as null when all windows are null", async () => {
    mockFindMany.mockResolvedValue([
      makeBatchJob({ id: "j1", functionKey: "ANKI_GEN", coalesceWindowEnd: null }),
    ]);

    const result = await getQueueSummary();
    expect(result[0]?.nextRunAt).toBeNull();
  });

  it("queries only QUEUED status jobs", async () => {
    mockFindMany.mockResolvedValue([]);

    await getQueueSummary();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "QUEUED" }),
      }),
    );
  });
});
