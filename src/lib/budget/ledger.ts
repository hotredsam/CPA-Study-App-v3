import { prisma } from "@/lib/prisma";
import { type Budget } from "@prisma/client";

/**
 * Increment the budget's currentUsageUsd by usdCost.
 * Uses updateMany with no where clause — the Budget table has exactly one row
 * (singleton pattern). This is atomic at the DB level.
 */
export async function recordSpend(
  _functionKey: string,
  usdCost: number,
): Promise<void> {
  await prisma.budget.updateMany({
    data: { currentUsageUsd: { increment: usdCost } },
  });
}

/**
 * Reads and returns the singleton Budget row.
 * Throws if no Budget row exists.
 */
export async function getCurrentBudget(): Promise<Budget> {
  const budget = await prisma.budget.findFirst();
  if (!budget) {
    throw new Error("No Budget row found — run seed to create the singleton row");
  }
  return budget;
}

/**
 * Reset monthly usage to zero and record the new month start.
 * Uses updateMany (singleton — no WHERE needed).
 */
export async function resetMonthlyBudget(): Promise<void> {
  await prisma.budget.updateMany({
    data: {
      currentUsageUsd: 0,
      currentMonthStart: new Date(),
    },
  });
}

export interface BudgetStatus {
  isOverWarn: boolean;
  isHardStop: boolean;
  autoDegrade: boolean;
  currentUsageUsd: number;
  monthlyCapUsd: number;
}

/**
 * Compute the budget status flags from the singleton Budget row.
 */
export async function checkBudgetStatus(): Promise<BudgetStatus> {
  const budget = await getCurrentBudget();

  const warnLevel = budget.warnThreshold * budget.monthlyCapUsd;

  return {
    isOverWarn: budget.currentUsageUsd >= warnLevel,
    isHardStop: budget.hardStop && budget.currentUsageUsd >= budget.monthlyCapUsd,
    autoDegrade: budget.autoDegrade,
    currentUsageUsd: budget.currentUsageUsd,
    monthlyCapUsd: budget.monthlyCapUsd,
  };
}
