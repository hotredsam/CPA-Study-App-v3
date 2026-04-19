import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TopicExtractInput = z.object({
  chunkId: z.string(),
  content: z.string(),
  chapterRef: z.string().optional(),
});

export const TopicExtractOutput = z.object({
  canonicalTopic: z.string(),
  subsection: z.string(),
  workedExamples: z.array(z.string()),
  fasbRefs: z.array(z.string()),
  ircRefs: z.array(z.string()),
  pcaobRefs: z.array(z.string()),
});

export type TopicExtractInput = z.infer<typeof TopicExtractInput>;
export type TopicExtractOutput = z.infer<typeof TopicExtractOutput>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: TopicExtractInput): string {
  const parts: string[] = [
    "Extract structured topic metadata from this CPA textbook chunk. Return JSON with canonicalTopic, subsection, workedExamples[], fasbRefs[], ircRefs[], pcaobRefs[].",
    "",
  ];

  if (input.chapterRef) {
    parts.push(`Chapter Reference: ${input.chapterRef}`);
    parts.push("");
  }

  parts.push("Chunk Content:");
  parts.push(input.content);
  parts.push("");
  parts.push(
    'Return exactly this JSON shape: {"canonicalTopic":"Revenue Recognition","subsection":"Variable Consideration","workedExamples":["Example 1..."],"fasbRefs":["ASC 606-10-25"],"ircRefs":[],"pcaobRefs":[]}',
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runTopicExtract(
  input: TopicExtractInput,
): Promise<TopicExtractOutput & { batchJobId?: string }> {
  const validated = TopicExtractInput.parse(input);

  const result = await runFunction(AiFunctionKey.TOPIC_EXTRACT, {
    prompt: buildPrompt(validated),
    chunkId: validated.chunkId,
  });

  // If batch mode returned a batchJobId, return it without parsing output
  if (result.batchJobId) {
    return {
      canonicalTopic: "",
      subsection: "",
      workedExamples: [],
      fasbRefs: [],
      ircRefs: [],
      pcaobRefs: [],
      batchJobId: result.batchJobId,
    };
  }

  const output = TopicExtractOutput.parse(result.output);

  // Update Chunk.topicId if a matching Topic exists (case-insensitive name match)
  const matchingTopic = await prisma.topic.findFirst({
    where: {
      name: { equals: output.canonicalTopic, mode: "insensitive" },
    },
  });

  if (matchingTopic) {
    await prisma.chunk.update({
      where: { id: validated.chunkId },
      data: { topicId: matchingTopic.id },
    });
  }

  return output;
}
