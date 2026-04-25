import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";
import { bucket, r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CPA_SECTION_OPTIONS, isActiveCpaSection } from "@/lib/cpa-sections";
import { getActiveExamSections } from "@/lib/exam-settings";
import { queueTextbookIndex } from "@/lib/textbooks/queue";

export const dynamic = "force-dynamic";

const CpaSectionSchema = z.enum(CPA_SECTION_OPTIONS);

type TextbookWithCount = Awaited<ReturnType<typeof prisma.textbook.findFirstOrThrow>> & {
  _count?: { chunks: number };
};

function serializeTextbook(textbook: TextbookWithCount) {
  return {
    id: textbook.id,
    title: textbook.title,
    publisher: textbook.publisher,
    sections: textbook.sections.filter(isActiveCpaSection),
    pages: textbook.pages,
    chunkCount: textbook._count?.chunks ?? textbook.chunkCount,
    indexStatus: textbook.indexStatus,
    sizeBytes: textbook.sizeBytes?.toString() ?? null,
    citedCount: textbook.citedCount,
    uploadedAt: textbook.uploadedAt,
    indexedAt: textbook.indexedAt,
  };
}

export async function GET() {
  try {
    const activeSections = await getActiveExamSections();
    const textbooks = await prisma.textbook.findMany({
      orderBy: { uploadedAt: "desc" },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    const items = textbooks
      .map((t) => ({
        ...serializeTextbook(t),
        sections: t.sections.filter((section) => (
          isActiveCpaSection(section) && activeSections.includes(section)
        )),
      }))
      .filter((t) => t.sections.length > 0 || textbooks.find((book) => book.id === t.id)?.sections.length === 0);

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
    const contentType = request.headers.get("content-type") ?? "";
    let parsed: z.infer<typeof CreateBody>;
    let file: Blob | null = null;
    let fileName = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      parsed = CreateBody.parse({
        title: form.get("title"),
        publisher: form.get("publisher") || undefined,
        sections: form.getAll("sections"),
      });
      const rawFile = form.get("file");
      if (rawFile instanceof Blob) {
        file = rawFile;
        fileName = rawFile instanceof File ? rawFile.name : "textbook";
      }
    } else {
      const body: unknown = await request.json();
      parsed = CreateBody.parse(body);
    }

    let textbook = await prisma.textbook.create({
      data: {
        title: parsed.title,
        publisher: parsed.publisher ?? null,
        sections: parsed.sections,
        indexStatus: "QUEUED",
      },
    });

    if (file) {
      const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
      const r2Key = `textbooks/${textbook.id}/source.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await r2Client().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: r2Key,
          Body: buffer,
          ContentType: file.type || "application/octet-stream",
        }),
      );
      textbook = await prisma.textbook.update({
        where: { id: textbook.id },
        data: {
          r2Key,
          sizeBytes: BigInt(buffer.byteLength),
          indexStatus: "INDEXING",
          indexedAt: null,
        },
      });
      try {
        await queueTextbookIndex({ textbookId: textbook.id, rebuildChunks: true });
      } catch (queueErr) {
        console.warn("[textbooks/POST] index queue skipped:", queueErr);
        textbook = await prisma.textbook.update({
          where: { id: textbook.id },
          data: { indexStatus: "QUEUED" },
        });
      }
    }

    const textbookWithCount = await prisma.textbook.findUniqueOrThrow({
      where: { id: textbook.id },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    return NextResponse.json({ textbook: serializeTextbook(textbookWithCount) }, { status: 201 });
  } catch (err) {
    return respond(err);
  }
}
