import { describe, it, expect, vi, beforeEach } from "vitest";
import { BatchJobStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    batchJob: {
      findUnique: vi.fn(),
    },
  },
}));

const { GET } = await import("@/app/api/batch/status/route");
const { prisma } = await import("@/lib/prisma");

const mockFindUnique = vi.mocked(prisma.batchJob.findUnique);

function makeBatchJob(overrides: Partial<{
  id: string;
  status: BatchJobStatus;
  functionKey: string;
  coalesceWindowEnd: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}> = {}) {
  const now = new Date();
  return {
    id: "job-abc",
    functionKey: "PIPELINE_GRADE",
    payload: { prompt: "test" },
    status: BatchJobStatus.QUEUED,
    coalesceWindowStart: now,
    coalesceWindowEnd: new Date(now.getTime() + 6 * 3600 * 1000),
    offPeakPreferred: false,
    createdAt: now,
    completedAt: null,
    resultId: null,
    ...overrides,
  };
}

describe("GET /api/batch/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct shape for valid job id", async () => {
    const job = makeBatchJob({ id: "job-xyz" });
    mockFindUnique.mockResolvedValue(job);

    const req = new Request("http://localhost/api/batch/status?id=job-xyz");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      id: string;
      status: string;
      functionKey: string;
      expectedCompletionAt: string | null;
      createdAt: string;
      completedAt: string | null;
    };

    expect(body.id).toBe("job-xyz");
    expect(body.status).toBe("QUEUED");
    expect(body.functionKey).toBe("PIPELINE_GRADE");
    expect(body.expectedCompletionAt).not.toBeNull();
    expect(body.createdAt).toBeDefined();
    expect(body.completedAt).toBeNull();
  });

  it("returns 404 for unknown job id", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/batch/status?id=nonexistent");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when id query param is missing", async () => {
    const req = new Request("http://localhost/api/batch/status");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns completedAt when job is COMPLETED", async () => {
    const completedAt = new Date();
    const job = makeBatchJob({ status: BatchJobStatus.COMPLETED, completedAt });
    mockFindUnique.mockResolvedValue(job);

    const req = new Request("http://localhost/api/batch/status?id=job-abc");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json() as { completedAt: string | null };
    expect(body.completedAt).not.toBeNull();
  });

  it("queries by the exact id passed in query string", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/batch/status?id=my-special-job");
    await GET(req);

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "my-special-job" } });
  });
});
