import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { headObject } from "@/lib/r2";
import { queueTextbookIndex } from "@/lib/textbooks/queue";
import { serializeTextbook, textbookWithCountInclude } from "@/lib/textbooks/serialize";
import {
  isAllowedPdfUpload,
  MAX_TEXTBOOK_UPLOAD_BYTES,
} from "@/lib/upload-constraints";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    let textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) throw new ApiError("NOT_FOUND", "textbook not found");
    if (!textbook.r2Key) throw new ApiError("UNPROCESSABLE", "Textbook upload has not been initialized.");

    const object = await headObject(textbook.r2Key);
    const sizeBytes = object.ContentLength ?? 0;
    const contentType = object.ContentType ?? "application/pdf";

    if (sizeBytes <= 0) {
      throw new ApiError("UNPROCESSABLE", "Uploaded textbook object is empty.");
    }
    if (sizeBytes > MAX_TEXTBOOK_UPLOAD_BYTES) {
      throw new ApiError("BAD_REQUEST", "Uploaded textbook is too large.", {
        maxBytes: MAX_TEXTBOOK_UPLOAD_BYTES,
        sizeBytes,
      }, 413);
    }
    if (!isAllowedPdfUpload({ fileName: textbook.r2Key, contentType })) {
      throw new ApiError("BAD_REQUEST", "Only PDF textbook uploads are supported right now.");
    }

    textbook = await prisma.textbook.update({
      where: { id },
      data: {
        sizeBytes: BigInt(sizeBytes),
        indexStatus: "INDEXING",
        indexedAt: null,
      },
    });

    try {
      await queueTextbookIndex({ textbookId: textbook.id, rebuildChunks: true });
    } catch (queueErr) {
      console.warn("[textbooks/complete] index queue skipped:", queueErr);
      textbook = await prisma.textbook.update({
        where: { id: textbook.id },
        data: { indexStatus: "QUEUED" },
      });
    }

    const textbookWithCount = await prisma.textbook.findUniqueOrThrow({
      where: { id: textbook.id },
      include: textbookWithCountInclude,
    });

    return NextResponse.json({ textbook: serializeTextbook(textbookWithCount) });
  } catch (err) {
    return respond(err);
  }
}
