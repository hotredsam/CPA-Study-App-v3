/**
 * Night 5 schema round-trip tests.
 * Each test creates a record, reads it back, asserts key fields, then cleans up.
 * All tests are skipped if DATABASE_URL is not set.
 * TODO: run in CI with a real Postgres instance.
 */
import { describe, it, afterEach, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const canReachDb = !!process.env.DATABASE_URL;

/** Generates a short random id to avoid test collisions */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Track created IDs for afterEach cleanup
let cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const fn of cleanups) {
    await fn().catch(() => {
      // Ignore cleanup errors — record may already be deleted
    });
  }
  cleanups = [];
});

// ── Topic ─────────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("Topic", () => {
  it("creates and reads back a Topic", async () => {
    const name = `Test Topic ${uid()}`;
    const topic = await prisma.topic.create({
      data: {
        section: "AUD",
        name,
        unit: "Audit Planning",
        mastery: 42.5,
        errorRate: 0.15,
        cardsDue: 7,
        aiNotes: { coreRule: "rule", pitfall: "trap" },
      },
    });
    cleanups.push(async () => {
      await prisma.topic.delete({ where: { id: topic.id } });
    });

    const found = await prisma.topic.findUniqueOrThrow({ where: { id: topic.id } });
    expect(found.name).toBe(name);
    expect(found.section).toBe("AUD");
    expect(found.mastery).toBeCloseTo(42.5);
    expect(found.cardsDue).toBe(7);
  });
});

// ── Textbook ──────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("Textbook", () => {
  it("creates and reads back a Textbook", async () => {
    const r2Key = `fixtures/test-${uid()}.pdf`;
    const textbook = await prisma.textbook.create({
      data: {
        title: `Test Textbook ${uid()}`,
        publisher: "TestPub",
        sections: ["FAR", "BAR"],
        pages: 300,
        chunkCount: 0,
        indexStatus: "READY",
        sizeBytes: BigInt(5_000_000),
        r2Key,
      },
    });
    cleanups.push(async () => {
      await prisma.textbook.delete({ where: { id: textbook.id } });
    });

    const found = await prisma.textbook.findUniqueOrThrow({ where: { id: textbook.id } });
    expect(found.publisher).toBe("TestPub");
    expect(found.indexStatus).toBe("READY");
    expect(found.r2Key).toBe(r2Key);
    expect(found.sizeBytes).toBe(BigInt(5_000_000));
  });
});

// ── Chunk ─────────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("Chunk", () => {
  it("creates and reads back a Chunk with a parent Textbook", async () => {
    const textbook = await prisma.textbook.create({
      data: {
        title: `Chunk Test TB ${uid()}`,
        indexStatus: "QUEUED",
      },
    });
    cleanups.push(async () => {
      await prisma.textbook.delete({ where: { id: textbook.id } });
    });

    const chunk = await prisma.chunk.create({
      data: {
        textbookId: textbook.id,
        order: 0,
        content: "Sample chunk content for testing purposes.",
      },
    });
    // Chunk is cascade-deleted when textbook is deleted — no extra cleanup needed

    const found = await prisma.chunk.findUniqueOrThrow({ where: { id: chunk.id } });
    expect(found.textbookId).toBe(textbook.id);
    expect(found.order).toBe(0);
    expect(found.content).toBe("Sample chunk content for testing purposes.");
  });
});

// ── AnkiCard ──────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("AnkiCard", () => {
  it("creates and reads back an AnkiCard", async () => {
    const front = `Front ${uid()}`;
    const card = await prisma.ankiCard.create({
      data: {
        front,
        back: "The answer is documented in ASC 606.",
        explanation: "Full explanation here.",
        section: "FAR",
        type: "QA",
      },
    });
    cleanups.push(async () => {
      await prisma.ankiCard.delete({ where: { id: card.id } });
    });

    const found = await prisma.ankiCard.findUniqueOrThrow({ where: { id: card.id } });
    expect(found.front).toBe(front);
    expect(found.section).toBe("FAR");
    expect(found.type).toBe("QA");
  });
});

// ── AnkiReview ────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("AnkiReview", () => {
  it("creates and reads back an AnkiReview linked to an AnkiCard", async () => {
    const card = await prisma.ankiCard.create({
      data: { front: `Review Test ${uid()}`, back: "Back content" },
    });
    cleanups.push(async () => {
      await prisma.ankiCard.delete({ where: { id: card.id } });
    });

    const review = await prisma.ankiReview.create({
      data: {
        cardId: card.id,
        rating: "GOOD",
        newInterval: 6,
        newEase: 2.6,
      },
    });
    // AnkiReview is cascade-deleted when card is deleted — no extra cleanup needed

    const found = await prisma.ankiReview.findUniqueOrThrow({ where: { id: review.id } });
    expect(found.cardId).toBe(card.id);
    expect(found.rating).toBe("GOOD");
    expect(found.newInterval).toBe(6);
    expect(found.newEase).toBeCloseTo(2.6);
  });
});

// ── Conversation ──────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("Conversation", () => {
  it("creates and reads back a Conversation", async () => {
    const scopeId = uid();
    const conv = await prisma.conversation.create({
      data: { scope: "STUDY", scopeId },
    });
    cleanups.push(async () => {
      await prisma.conversation.delete({ where: { id: conv.id } });
    });

    const found = await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } });
    expect(found.scope).toBe("STUDY");
    expect(found.scopeId).toBe(scopeId);
  });
});

// ── ChatMessage ───────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("ChatMessage", () => {
  it("creates and reads back a ChatMessage linked to a Conversation", async () => {
    const conv = await prisma.conversation.create({
      data: { scope: "REVIEW", scopeId: uid() },
    });
    cleanups.push(async () => {
      await prisma.conversation.delete({ where: { id: conv.id } });
    });

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        role: "USER",
        content: "What is the matching principle?",
      },
    });
    // ChatMessage is cascade-deleted when conversation is deleted

    const found = await prisma.chatMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(found.role).toBe("USER");
    expect(found.content).toBe("What is the matching principle?");
    expect(found.conversationId).toBe(conv.id);
  });
});

// ── UserSettings ──────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("UserSettings", () => {
  it("upserts and reads back UserSettings singleton", async () => {
    const settings = await prisma.userSettings.upsert({
      where: { id: "singleton" },
      update: { accentHue: 99 },
      create: {
        id: "singleton",
        theme: "paper",
        accentHue: 99,
        density: "comfortable",
        serifFamily: "Instrument Serif",
      },
    });

    const found = await prisma.userSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    expect(found.id).toBe("singleton");
    expect(found.accentHue).toBe(99);

    // Restore default accentHue so other tests/seed aren't affected
    cleanups.push(async () => {
      await prisma.userSettings.update({ where: { id: "singleton" }, data: { accentHue: 18 } });
    });

    expect(settings.theme).toBe("paper");
  });
});

// ── ModelConfig ───────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("ModelConfig", () => {
  it("upserts and reads back a ModelConfig row", async () => {
    const config = await prisma.modelConfig.upsert({
      where: { functionKey: "CHAT_TUTOR" },
      update: { model: "anthropic/claude-sonnet-4-6", cacheEnabled: true },
      create: {
        functionKey: "CHAT_TUTOR",
        model: "anthropic/claude-sonnet-4-6",
        batchEnabled: false,
        cacheEnabled: true,
        useOAuthFallback: false,
      },
    });

    const found = await prisma.modelConfig.findUniqueOrThrow({
      where: { functionKey: "CHAT_TUTOR" },
    });
    expect(found.model).toBe("anthropic/claude-sonnet-4-6");
    expect(found.cacheEnabled).toBe(true);
    expect(found.functionKey).toBe("CHAT_TUTOR");
    expect(config.batchEnabled).toBe(false);
  });
});

// ── IndexingConfig ────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("IndexingConfig", () => {
  it("upserts and reads back IndexingConfig singleton", async () => {
    const cfg = await prisma.indexingConfig.upsert({
      where: { id: "singleton" },
      update: { chunkSize: 512 },
      create: { id: "singleton" },
    });

    const found = await prisma.indexingConfig.findUniqueOrThrow({ where: { id: "singleton" } });
    expect(found.id).toBe("singleton");
    expect(found.chunkSize).toBe(512);
    expect(found.overlapWindow).toBe(64);
    expect(cfg.batchMode).toBe(true);
  });
});

// ── Budget ────────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("Budget", () => {
  it("creates and reads back a Budget row", async () => {
    const budget = await prisma.budget.create({
      data: {
        monthlyCapUsd: 100,
        warnThreshold: 0.75,
        autoDegrade: true,
        hardStop: false,
        currentUsageUsd: 0,
      },
    });
    cleanups.push(async () => {
      await prisma.budget.delete({ where: { id: budget.id } });
    });

    const found = await prisma.budget.findUniqueOrThrow({ where: { id: budget.id } });
    expect(found.monthlyCapUsd).toBeCloseTo(100);
    expect(found.warnThreshold).toBeCloseTo(0.75);
    expect(found.autoDegrade).toBe(true);
    expect(found.hardStop).toBe(false);
  });
});

// ── CacheEntry ────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("CacheEntry", () => {
  it("creates and reads back a CacheEntry", async () => {
    const functionKey = `test-fn-${uid()}`;
    const inputHash = `hash-${uid()}`;
    const entry = await prisma.cacheEntry.create({
      data: {
        functionKey,
        inputHash,
        output: { result: "cached output" },
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    cleanups.push(async () => {
      await prisma.cacheEntry.delete({ where: { id: entry.id } });
    });

    const found = await prisma.cacheEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(found.functionKey).toBe(functionKey);
    expect(found.inputHash).toBe(inputHash);
    expect(found.hitCount).toBe(0);
  });
});

// ── BatchJob ──────────────────────────────────────────────────────────────────

describe.skipIf(!canReachDb)("BatchJob", () => {
  it("creates and reads back a BatchJob", async () => {
    const functionKey = `anki-gen-${uid()}`;
    const job = await prisma.batchJob.create({
      data: {
        functionKey,
        payload: { topicId: "abc123", count: 10 },
        status: "QUEUED",
        offPeakPreferred: true,
      },
    });
    cleanups.push(async () => {
      await prisma.batchJob.delete({ where: { id: job.id } });
    });

    const found = await prisma.batchJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(found.functionKey).toBe(functionKey);
    expect(found.status).toBe("QUEUED");
    expect(found.offPeakPreferred).toBe(true);
  });
});
