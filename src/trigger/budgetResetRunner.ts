import { schedules, logger } from "@trigger.dev/sdk/v3";
import { resetMonthlyBudget } from "@/lib/budget/ledger";

/**
 * Cron task that resets the monthly budget on the 1st of each month at midnight UTC.
 */
export const budgetResetRunner = schedules.task({
  id: "budget-reset-runner",
  cron: "0 0 1 * *",
  maxDuration: 60, // 1 minute max
  run: async () => {
    await resetMonthlyBudget();
    logger.log("budget-reset-runner: monthly budget reset complete");
    return { reset: true };
  },
});
