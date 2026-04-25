import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { respond } from "@/lib/api-error";
import { runTopicNotes } from "@/lib/ai/topic-notes";
import { CpaSection } from "@prisma/client";
import { ACTIVE_CPA_SECTIONS } from "@/lib/cpa-sections";

export const dynamic = "force-dynamic";

const PostBodySchema = z.object({
  section: z.enum(ACTIVE_CPA_SECTIONS).optional(),
  topicIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = PostBodySchema.parse(body);

    const where: Prisma.TopicWhereInput = {};

    if (parsed.topicIds && parsed.topicIds.length > 0) {
      where.id = { in: parsed.topicIds };
    } else if (parsed.section) {
      where.section = parsed.section as CpaSection;
    } else {
      where.section = { in: ACTIVE_CPA_SECTIONS as unknown as CpaSection[] };
    }

    const topics = await prisma.topic.findMany({ where });

    let processed = 0;
    // Sequential for...of — NOT Promise.all (trigger.dev v3 + heavy operation constraint)
    for (const topic of topics) {
      try {
        await runTopicNotes({
          topicId: topic.id,
          topicName: topic.name,
        });
        processed++;
      } catch {
        // Non-fatal — continue to next topic
      }
    }

    return NextResponse.json({ processed });
  } catch (err) {
    return respond(err);
  }
}
