import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { CPA_SECTION_OPTIONS } from "@/lib/cpa-sections";
import { presignUpload } from "@/lib/r2";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientRateLimitKey, rateLimitResponse } from "@/lib/security/request";
import { serializeTextbook, textbookWithCountInclude } from "@/lib/textbooks/serialize";
import {
  isAllowedPdfUpload,
  MAX_TEXTBOOK_UPLOAD_BYTES,
  normalizedContentType,
} from "@/lib/upload-constraints";

export const dynamic = "force-dynamic";

const CpaSectionSchema = z.enum(CPA_SECTION_OPTIONS);

const Body = z.object({
  title: z.string().min(1).max(200),
  publisher: z.string().max(120).optional(),
  sections: z.array(CpaSectionSchema).default([]),
  fileName: z.string().min(1).max(240),
  contentType: z.string().min(1).max(120).default("application/pdf"),
  sizeBytes: z.number().int().min(1).max(MAX_TEXTBOOK_UPLOAD_BYTES),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimit = checkRateLimit({
      key: clientRateLimitKey(request, "textbooks:upload-url"),
      limit: 20,
      windowMs: 60 * 60_000,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "invalid body", parsed.error.flatten());
    }
    if (!isAllowedPdfUpload(parsed.data)) {
      throw new ApiError("BAD_REQUEST", "Only PDF textbook uploads are supported right now.");
    }

    let textbook = await prisma.textbook.create({
      data: {
        title: parsed.data.title,
        publisher: parsed.data.publisher ?? null,
        sections: parsed.data.sections,
        sizeBytes: BigInt(parsed.data.sizeBytes),
        indexStatus: "QUEUED",
      },
    });

    const r2Key = `textbooks/${textbook.id}/source.pdf`;
    textbook = await prisma.textbook.update({
      where: { id: textbook.id },
      data: { r2Key },
    });

    const contentType = normalizedContentType(parsed.data.contentType, "application/pdf");
    const uploadUrl = await presignUpload(r2Key, contentType);
    const textbookWithCount = await prisma.textbook.findUniqueOrThrow({
      where: { id: textbook.id },
      include: textbookWithCountInclude,
    });

    return NextResponse.json({
      textbook: serializeTextbook(textbookWithCount),
      uploadUrl,
      r2Key,
      expiresInSec: 900,
      maxBytes: MAX_TEXTBOOK_UPLOAD_BYTES,
    }, { status: 201 });
  } catch (err) {
    return respond(err);
  }
}
