import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TopicNotesInput = z.object({
  topicId: z.string(),
  topicName: z.string(),
  recentHistory: z.string().optional(),
});

export const TopicNotesOutput = z.object({
  coreRule: z.string(),
  pitfall: z.string(),
  citation: z.string(),
  performance: z.string(),
});

export type TopicNotesInput = z.infer<typeof TopicNotesInput>;
export type TopicNotesOutput = z.infer<typeof TopicNotesOutput>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: TopicNotesInput): string {
  const parts: string[] = [
    "Generate structured AI study notes for this CPA topic. Include: coreRule (the main accounting rule or concept), pitfall (common student mistake), citation (FASB/IRC/PCAOB reference), performance (how this topic appears on the exam). Return JSON.",
    "",
    `Topic: ${input.topicName}`,
    "",
  ];

  if (input.recentHistory) {
    parts.push(`Recent Study History: ${input.recentHistory}`);
    parts.push("");
  }

  parts.push(
    'Return exactly this JSON shape: {"coreRule":"The main rule is...","pitfall":"Students often confuse...","citation":"ASC 606-10-25","performance":"This topic appears as..."}',
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runTopicNotes(input: TopicNotesInput): Promise<TopicNotesOutput> {
  const validated = TopicNotesInput.parse(input);

  const result = await runFunction(AiFunctionKey.TOPIC_NOTES, {
    prompt: buildPrompt(validated),
    topicId: validated.topicId,
  });

  const output = TopicNotesOutput.parse(result.output);

  // Write Topic.aiNotes JSON
  await prisma.topic.update({
    where: { id: validated.topicId },
    data: {
      aiNotes: {
        coreRule: output.coreRule,
        pitfall: output.pitfall,
        citation: output.citation,
        performance: output.performance,
      },
    },
  });

  return output;
}
