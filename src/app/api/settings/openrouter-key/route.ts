import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptKey } from "@/lib/llm/crypto";
import { hasOpenRouterKeyConfigured } from "@/lib/llm/openrouter";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const PostBody = z.object({
  key: z.string().trim().min(1, "key must not be empty"),
});

/**
 * POST /api/settings/openrouter-key
 * Encrypt and upsert the OpenRouter API key.
 * Never echoes the key back — returns { success: true } only.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
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

    return NextResponse.json({ success: true });
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
    return NextResponse.json({
      hasKey: await hasOpenRouterKeyConfigured(),
    });
  } catch (err) {
    return respond(err);
  }
}
