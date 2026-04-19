import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.textbook.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("NOT_FOUND", `Textbook ${id} not found`);
    }

    const textbook = await prisma.textbook.update({
      where: { id },
      data: { indexStatus: "QUEUED", indexedAt: null },
    });

    if (process.env.TRIGGER_SECRET_KEY) {
      try {
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("textbook-indexer", { textbookId: id });
      } catch (triggerErr) {
        console.warn("[textbooks/reindex] trigger skipped:", triggerErr);
      }
    } else {
      console.warn("[textbooks/reindex] TRIGGER_SECRET_KEY not set, skipping trigger");
    }

    return NextResponse.json({
      textbook: {
        ...textbook,
        sizeBytes: textbook.sizeBytes?.toString() ?? null,
      },
    });
  } catch (err) {
    return respond(err);
  }
}
