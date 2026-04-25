import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { isActiveCpaSection } from "@/lib/cpa-sections";
import { getActiveExamSections } from "@/lib/exam-settings";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const activeSections = await getActiveExamSections();

    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!textbook) {
      throw new ApiError("NOT_FOUND", `Textbook ${id} not found`);
    }

    return NextResponse.json({
      textbook: {
        ...textbook,
        sections: textbook.sections.filter((section) => (
          isActiveCpaSection(section) && activeSections.includes(section)
        )),
        sizeBytes: textbook.sizeBytes?.toString() ?? null,
        chunkCount: textbook._count.chunks,
      },
    });
  } catch (err) {
    return respond(err);
  }
}
