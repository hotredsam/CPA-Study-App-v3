import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budget: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const { recordSpend, getCurrentBudget, resetMonthlyBudget, checkBudgetStatus } =
  await import("@/lib/budget/ledger");
const { prisma } = await import("@/lib/prisma");

const mockUpdateMany = vi.mocked(prisma.budget.updateMany);
const mockFindFirst = vi.mocked(prisma.budget.findFirst);

function makeBudget(overrides: Partial<{
  id: string;
  monthlyCapUsd: number;
  warnThreshold: number;
  autoDegrade: boolean;
  hardStop: boolean;
  currentUsageUsd: number;
  currentMonthStart: Date;
  rolloverEnabled: boolean;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: "budget-1",
    monthlyCapUsd: 50,
    warnThreshold: 0.8,
    autoDegrade: true,
    hardStop: false,
    currentUsageUsd: 0,
    currentMonthStart: now,
    rolloverEnabled: false,
    updatedAt: now,
    ...overrides,
  };
}

describe("recordSpend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("calls updateMany with increment on currentUsageUsd", async () => {
    await recordSpend("PIPELINE_GRADE", 0.005);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      data: { currentUsageUsd: { increment: 0.005 } },
    });
  });

  it("handles zero cost without error", async () => {
    await recordSpend("PIPELINE_GRADE", 0);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      data: { currentUsageUsd: { increment: 0 } },
    });
  });
});

describe("getCurrentBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the budget row when it exists", async () => {
    const budget = makeBudget({ currentUsageUsd: 10 });
    mockFindFirst.mockResolvedValue(budget);

    const result = await getCurrentBudget();
    expect(result).toEqual(budget);
  });

  it("throws when no budget row exists", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getCurrentBudget()).rejects.toThrow(/No Budget row found/);
  });
});

describe("resetMonthlyBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("resets currentUsageUsd to 0 and sets currentMonthStart to now", async () => {
    const before = Date.now();
    await resetMonthlyBudget();

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentUsageUsd: 0,
        }),
      }),
    );

    const call = mockUpdateMany.mock.calls[0]?.[0];
    const monthStart = (call?.data as { currentMonthStart?: Date })?.currentMonthStart;
    expect(monthStart).toBeInstanceOf(Date);
    expect(monthStart!.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("checkBudgetStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isOverWarn=false when usage is below threshold", async () => {
    mockFindFirst.mockResolvedValue(
      makeBudget({ monthlyCapUsd: 50, warnThreshold: 0.8, currentUsageUsd: 30 }),
    );

    const status = await checkBudgetStatus();
    expect(status.isOverWarn).toBe(false);
    expect(status.isHardStop).toBe(false);
  });

  it("returns isOverWarn=true when usage meets or exceeds warn threshold", async () => {
    mockFindFirst.mockResolvedValue(
      makeBudget({ monthlyCapUsd: 50, warnThreshold: 0.8, currentUsageUsd: 40 }),
    );

    const status = await checkBudgetStatus();
    // 40 >= 0.8 * 50 = 40 → exactly at threshold
    expect(status.isOverWarn).toBe(true);
  });

  it("returns isHardStop=true when hardStop=true and cap reached", async () => {
    mockFindFirst.mockResolvedValue(
      makeBudget({
        hardStop: true,
        monthlyCapUsd: 50,
        currentUsageUsd: 50,
        warnThreshold: 0.8,
      }),
    );

    const status = await checkBudgetStatus();
    expect(status.isHardStop).toBe(true);
  });

  it("returns isHardStop=false when hardStop=false even at cap", async () => {
    mockFindFirst.mockResolvedValue(
      makeBudget({
        hardStop: false,
        monthlyCapUsd: 50,
        currentUsageUsd: 50,
        warnThreshold: 0.8,
      }),
    );

    const status = await checkBudgetStatus();
    expect(status.isHardStop).toBe(false);
  });

  it("returns correct currentUsageUsd and monthlyCapUsd", async () => {
    mockFindFirst.mockResolvedValue(
      makeBudget({ monthlyCapUsd: 100, currentUsageUsd: 25 }),
    );

    const status = await checkBudgetStatus();
    expect(status.currentUsageUsd).toBe(25);
    expect(status.monthlyCapUsd).toBe(100);
  });

  it("returns autoDegrade from budget row", async () => {
    mockFindFirst.mockResolvedValue(makeBudget({ autoDegrade: false }));

    const status = await checkBudgetStatus();
    expect(status.autoDegrade).toBe(false);
  });
});
