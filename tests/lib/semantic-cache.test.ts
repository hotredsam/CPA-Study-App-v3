import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cacheEntry: {
      findMany: vi.fn(),
    },
  },
}));

// Mock @xenova/transformers for embed tests
vi.mock("@xenova/transformers", () => ({
  pipeline: vi.fn().mockResolvedValue(
    vi.fn().mockResolvedValue({ data: new Float32Array([0.1, 0.2, 0.3]) }),
  ),
}));

const { cosineSimilarity, findSemanticMatch, embed } = await import(
  "@/lib/cache/semantic-cache"
);
const { prisma } = await import("@/lib/prisma");

const mockFindMany = vi.mocked(prisma.cacheEntry.findMany);

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns correct similarity for non-trivial vectors", () => {
    // [1,1] · [1,1] / (sqrt(2) * sqrt(2)) = 2 / 2 = 1
    expect(cosineSimilarity([1, 1], [1, 1])).toBeCloseTo(1);
    // [1,0] · [0.5,0.5] / (1 * sqrt(0.5)) = 0.5 / 0.707 ≈ 0.707
    expect(cosineSimilarity([1, 0], [0.5, 0.5])).toBeCloseTo(0.707, 2);
  });
});

describe("findSemanticMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Remove CF env vars so Cloudflare path is skipped
    delete process.env["CF_AI_TOKEN"];
    delete process.env["CF_ACCOUNT_ID"];
  });

  const makeCacheEntry = (embedding: number[]) => ({
    id: "entry-1",
    functionKey: "PIPELINE_GRADE",
    inputHash: "hash123",
    embedding: embedding,
    output: { score: 9 },
    hitCount: 2,
    precision: "provisional",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  it("returns null when embedding is empty (all sources fail)", async () => {
    // Mock xenova to fail so we get empty embedding fallback
    const xenovaMod = await import("@xenova/transformers");
    vi.mocked(xenovaMod.pipeline).mockRejectedValueOnce(new Error("fail"));

    const result = await findSemanticMatch("PIPELINE_GRADE", "some text");
    expect(result).toBeNull();
  });

  it("returns match when stored embedding is above threshold", async () => {
    // embed() will produce [0.1, 0.2, 0.3] via mocked xenova
    // Store same vector — similarity = 1.0 > 0.97 threshold
    const storedVec = [0.1, 0.2, 0.3];
    mockFindMany.mockResolvedValue([makeCacheEntry(storedVec)]);

    const result = await findSemanticMatch("PIPELINE_GRADE", "test input", 0.97);
    expect(result).not.toBeNull();
    expect(result?.score).toBeGreaterThanOrEqual(0.97);
    expect(result?.entry.id).toBe("entry-1");
  });

  it("returns null when stored embedding similarity is below threshold", async () => {
    // Orthogonal vector — similarity ≈ 0
    const storedVec = [-0.3, 0.2, -0.1];
    mockFindMany.mockResolvedValue([makeCacheEntry(storedVec)]);

    const result = await findSemanticMatch("PIPELINE_GRADE", "test input", 0.97);
    expect(result).toBeNull();
  });

  it("returns null when no entries in DB", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await findSemanticMatch("PIPELINE_GRADE", "test input");
    expect(result).toBeNull();
  });
});

describe("embed", () => {
  beforeEach(() => {
    delete process.env["CF_AI_TOKEN"];
    delete process.env["CF_ACCOUNT_ID"];
  });

  it("returns EmbeddingResult with provisional precision via xenova mock", async () => {
    const result = await embed("test text");
    // xenova mock returns Float32Array([0.1, 0.2, 0.3])
    expect(result.embedding).toHaveLength(3);
    expect(result.precision).toBe("provisional");
  });

  it("returns empty embedding when all sources fail", async () => {
    const xenovaMod = await import("@xenova/transformers");
    vi.mocked(xenovaMod.pipeline).mockRejectedValueOnce(new Error("network error"));

    const result = await embed("test text");
    // Fallback: empty embedding
    expect(result.embedding).toHaveLength(0);
    expect(result.precision).toBe("provisional");
  });
});
