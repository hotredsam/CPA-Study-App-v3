import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AiFunctionKey } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

const { assertSpendAllowed, readSpendGateSnapshot } = await import("./spend-gates");
const { prisma } = await import("@/lib/prisma");

const mockQueryRaw = vi.mocked(prisma.$queryRaw);

describe("spend gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["SPEND_GATES_ENABLED"];
    delete process.env["OPENROUTER_MAX_COST_PER_CALL_USD"];
    delete process.env["OPENROUTER_INDEXING_MAX_COST_PER_CALL_USD"];
    delete process.env["OPENROUTER_DAILY_CAP_USD"];
    delete process.env["OPENROUTER_RECORDING_CAP_USD"];
    delete process.env["OPENROUTER_QUESTION_CAP_USD"];
    mockQueryRaw.mockResolvedValue([{ total: 0 }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps normal AI calls on the low launch per-call cap", async () => {
    process.env["OPENROUTER_MAX_COST_PER_CALL_USD"] = "0.15";

    await expect(
      assertSpendAllowed(AiFunctionKey.CHAT_TUTOR, {}, 0.18),
    ).rejects.toThrow(/spend gate/i);
  });

  it("allows textbook indexing calls to use the separate indexing cap", async () => {
    process.env["OPENROUTER_MAX_COST_PER_CALL_USD"] = "0.15";
    process.env["OPENROUTER_INDEXING_MAX_COST_PER_CALL_USD"] = "1";

    const snapshot = await assertSpendAllowed("TEXTBOOK_HTML_RENDER", {}, 0.18);

    expect(snapshot.perCallCapUsd).toBe(1);
  });

  it("uses the indexing cap for topic and card generation during textbook indexing", async () => {
    process.env["OPENROUTER_INDEXING_MAX_COST_PER_CALL_USD"] = "1";

    const snapshot = await readSpendGateSnapshot(AiFunctionKey.ANKI_GEN, {}, 0.2);

    expect(snapshot.perCallCapUsd).toBe(1);
  });
});
