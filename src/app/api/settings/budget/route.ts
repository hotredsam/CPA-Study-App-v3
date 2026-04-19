import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBudgetStatus } from "@/lib/budget/ledger";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/budget
 * Returns full budget row plus computed status flags.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [status, budget] = await Promise.all([
      checkBudgetStatus(),
      prisma.budget.findFirst(),
    ]);

    return NextResponse.json({ status, budget });
  } catch (err) {
    return respond(err);
  }
}

const BudgetUpdateSchema = z.object({
  monthlyCapUsd: z.number().positive().optional(),
  warnThreshold: z.number().min(0).max(1).optional(),
  autoDegrade: z.boolean().optional(),
  hardStop: z.boolean().optional(),
  rolloverEnabled: z.boolean().optional(),
});

/**
 * POST /api/settings/budget
 * Update budget configuration. All fields optional.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = BudgetUpdateSchema.safeParse(raw);

    if (!parsed.success) {
      return respond(parsed.error);
    }

    const { monthlyCapUsd, warnThreshold, autoDegrade, hardStop, rolloverEnabled } =
      parsed.data;

    const updateData: Record<string, unknown> = {};
    if (monthlyCapUsd !== undefined) updateData["monthlyCapUsd"] = monthlyCapUsd;
    if (warnThreshold !== undefined) updateData["warnThreshold"] = warnThreshold;
    if (autoDegrade !== undefined) updateData["autoDegrade"] = autoDegrade;
    if (hardStop !== undefined) updateData["hardStop"] = hardStop;
    if (rolloverEnabled !== undefined) updateData["rolloverEnabled"] = rolloverEnabled;

    await prisma.budget.updateMany({ data: updateData });

    const [status, budget] = await Promise.all([
      checkBudgetStatus(),
      prisma.budget.findFirst(),
    ]);

    return NextResponse.json({ status, budget });
  } catch (err) {
    return respond(err);
  }
}
