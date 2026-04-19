import { NextResponse } from "next/server";
import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const AiFunctionKeySchema = z.nativeEnum(AiFunctionKey);

const UpsertBody = z.object({
  functionKey: AiFunctionKeySchema,
  model: z.string().min(1),
  batchEnabled: z.boolean().optional(),
  cacheEnabled: z.boolean().optional(),
  useOAuthFallback: z.boolean().optional(),
});

/**
 * GET /api/settings/model-config
 * Returns all ModelConfig rows ordered by functionKey.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const configs = await prisma.modelConfig.findMany({
      orderBy: { functionKey: "asc" },
    });

    return NextResponse.json({ configs });
  } catch (err) {
    return respond(err);
  }
}

/**
 * POST /api/settings/model-config
 * Upsert a ModelConfig row by functionKey.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = UpsertBody.safeParse(raw);
    if (!parsed.success) {
      return respond(parsed.error);
    }

    const { functionKey, model, batchEnabled, cacheEnabled, useOAuthFallback } =
      parsed.data;

    const now = new Date();

    const config = await prisma.modelConfig.upsert({
      where: { functionKey },
      create: {
        functionKey,
        model,
        batchEnabled: batchEnabled ?? false,
        cacheEnabled: cacheEnabled ?? true,
        useOAuthFallback: useOAuthFallback ?? false,
        updatedAt: now,
      },
      update: {
        model,
        ...(batchEnabled !== undefined ? { batchEnabled } : {}),
        ...(cacheEnabled !== undefined ? { cacheEnabled } : {}),
        ...(useOAuthFallback !== undefined ? { useOAuthFallback } : {}),
        updatedAt: now,
      },
    });

    return NextResponse.json({ config });
  } catch (err) {
    return respond(err);
  }
}
