import { prisma } from "@/lib/prisma";

export interface EmbeddingResult {
  embedding: number[];
  precision: "full" | "provisional";
}

const CF_AI_ENDPOINT = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-large-en-v1.5`;

interface CfAiResponse {
  result: {
    data: number[][];
  };
}

async function embedViaCloudflare(text: string): Promise<number[]> {
  const token = process.env["CF_AI_TOKEN"];
  const accountId = process.env["CF_ACCOUNT_ID"];

  if (!token || !accountId) {
    throw new Error("CF_AI_TOKEN or CF_ACCOUNT_ID not set");
  }

  const res = await fetch(CF_AI_ENDPOINT(accountId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text] }),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare AI error ${res.status}`);
  }

  const data = (await res.json()) as CfAiResponse;
  const vec = data.result.data[0];
  if (!vec || vec.length === 0) {
    throw new Error("Cloudflare AI returned empty embedding");
  }
  return vec;
}

async function embedViaXenova(text: string): Promise<number[]> {
  // Dynamic import to avoid top-level ESM issues
  const { pipeline } = await import("@xenova/transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
  const output = await extractor(text, { pooling: "mean", normalize: true }) as { data: number[] | Float32Array };
  return Array.from(output.data);
}

/**
 * Produce an embedding for `text` using the best available source:
 * 1. Cloudflare Workers AI (full precision) — if env vars are set
 * 2. Local @xenova/transformers (provisional)
 * 3. Empty fallback (provisional) — cache miss on similarity
 */
export async function embed(text: string): Promise<EmbeddingResult> {
  // 1. Cloudflare
  if (process.env["CF_AI_TOKEN"] && process.env["CF_ACCOUNT_ID"]) {
    try {
      const embedding = await embedViaCloudflare(text);
      return { embedding, precision: "full" };
    } catch {
      // fall through to next option
    }
  }

  // 2. Local @xenova/transformers
  try {
    const embedding = await embedViaXenova(text);
    return { embedding, precision: "provisional" };
  } catch {
    // fall through to empty fallback
  }

  // 3. Empty fallback — caller treats as cache miss
  return { embedding: [], precision: "provisional" };
}

/**
 * Standard cosine similarity between two equal-length vectors.
 * Returns 0 if either vector is zero-length or norms are zero.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Find the best-matching unexpired CacheEntry for `functionKey` whose stored
 * embedding is semantically similar to `inputText` at or above `threshold`.
 */
export async function findSemanticMatch(
  functionKey: string,
  inputText: string,
  threshold = 0.97,
): Promise<{ entry: { id: string; functionKey: string; inputHash: string; embedding: unknown; output: unknown; hitCount: number; precision: string | null; createdAt: Date; expiresAt: Date }; score: number } | null> {
  const { embedding: queryEmbedding } = await embed(inputText);

  // Empty embedding = fallback path, cannot do similarity search
  if (queryEmbedding.length === 0) {
    return null;
  }

  const now = new Date();

  // Fetch all unexpired entries for this functionKey
  // (filter out null embeddings in-process to avoid Prisma JSON null filter quirks)
  const entries = await prisma.cacheEntry.findMany({
    where: {
      functionKey,
      expiresAt: { gt: now },
    },
  });

  let bestEntry: typeof entries[0] | null = null;
  let bestScore = -Infinity;

  for (const entry of entries) {
    if (entry.embedding === null) continue;

    let storedVec: number[];
    try {
      if (Array.isArray(entry.embedding)) {
        storedVec = entry.embedding as number[];
      } else {
        storedVec = JSON.parse(String(entry.embedding)) as number[];
      }
    } catch {
      continue;
    }

    const score = cosineSimilarity(queryEmbedding, storedVec);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry !== null && bestScore >= threshold) {
    return { entry: bestEntry, score: bestScore };
  }

  return null;
}
