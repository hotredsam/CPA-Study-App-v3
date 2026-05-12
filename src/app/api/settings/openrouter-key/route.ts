import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptKey } from "@/lib/llm/crypto";
import { hasOpenRouterKeyConfigured } from "@/lib/llm/openrouter";
import { respond } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientRateLimitKey, noStoreJson, rateLimitResponse } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const PostBody = z.object({
  key: z.string().trim().min(1, "key must not be empty").max(512, "key is too long"),
});

/**
 * POST /api/settings/openrouter-key
 * Encrypt and upsert the OpenRouter API key.
 * Never echoes the key back — returns { success: true } only.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimit = checkRateLimit({
      key: clientRateLimitKey(request, "settings:openrouter-key"),
      limit: 10,
      windowMs: 10 * 60_000,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const raw = await request.json().catch(() => ({}));
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return respond(parsed.error);
    }

    const { key } = parsed.data;
    const encrypted = encryptKey(key);

    await prisma.userSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        openRouterKeyEnc: encrypted,
      },
      update: {
        openRouterKeyEnc: encrypted,
      },
    });

    return noStoreJson({ success: true });
  } catch (err) {
    return respond(err);
  }
}

/**
 * GET /api/settings/openrouter-key
 * Returns { hasKey: boolean } — never returns the actual key.
 */
export async function GET(): Promise<NextResponse> {
  try {
    return noStoreJson({
      hasKey: await hasOpenRouterKeyConfigured(),
    });
  } catch (err) {
    return respond(err);
  }
}
