import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const CpaSectionSchema = z.enum(["AUD", "BAR", "FAR", "REG", "ISC", "TCP", "BEC"]);

export async function GET() {
  try {
    const textbooks = await prisma.textbook.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    const items = textbooks.map((t) => ({
      id: t.id,
      title: t.title,
      publisher: t.publisher,
      sections: t.sections,
      pages: t.pages,
      chunkCount: t._count.chunks,
      indexStatus: t.indexStatus,
      sizeBytes: t.sizeBytes?.toString() ?? null,
      citedCount: t.citedCount,
      uploadedAt: t.uploadedAt,
      indexedAt: t.indexedAt,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    return respond(err);
  }
}

const CreateBody = z.object({
  title: z.string().min(1),
  publisher: z.string().optional(),
  sections: z.array(CpaSectionSchema).default([]),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = CreateBody.parse(body);

    const textbook = await prisma.textbook.create({
      data: {
        title: parsed.title,
        publisher: parsed.publisher ?? null,
        sections: parsed.sections,
        indexStatus: "QUEUED",
      },
    });

    // Trigger textbook-indexer task if credentials are available
    if (process.env.TRIGGER_SECRET_KEY) {
      try {
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("textbook-indexer", { textbookId: textbook.id });
      } catch (triggerErr) {
        console.warn("[textbooks/POST] trigger skipped:", triggerErr);
      }
    } else {
      console.warn("[textbooks/POST] TRIGGER_SECRET_KEY not set, skipping trigger");
    }

    return NextResponse.json({ textbook }, { status: 201 });
  } catch (err) {
    return respond(err);
  }
}
