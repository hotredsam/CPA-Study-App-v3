import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { runTopicNotes } from "@/lib/ai/topic-notes";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const topic = await prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      throw new ApiError("NOT_FOUND", `Topic not found: ${id}`);
    }

    const aiNotes = await runTopicNotes({
      topicId: topic.id,
      topicName: topic.name,
    });

    return NextResponse.json({ topicId: id, aiNotes });
  } catch (err) {
    return respond(err);
  }
}
