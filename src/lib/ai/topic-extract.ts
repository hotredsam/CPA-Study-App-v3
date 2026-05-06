import { z } from "zod";
import { AiFunctionKey, CpaSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inferBeckerUnitLabel } from "@/lib/becker-units";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TopicExtractInput = z.object({
  chunkId: z.string(),
  content: z.string(),
  chapterRef: z.string().optional(),
  section: z.nativeEnum(CpaSection).optional(),
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
    "Use canonicalTopic for the teachable accounting concept. Do not use subsection for Becker unit labels such as F1 or F1 M1; the app derives those from the chunk reference.",
    "",
  ];

  if (input.chapterRef) {
    parts.push(`Chapter Reference: ${input.chapterRef}`);
    parts.push("");
  }

  if (input.section) {
    parts.push(`CPA Section: ${input.section}`);
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
  const beckerUnit = inferBeckerUnitLabel({
    chapterRef: validated.chapterRef,
    section: validated.section,
    content: validated.content,
  });

  // Link to an existing Topic if possible; otherwise create one for uploaded
  // textbook content so a blank app can build its topic map from scratch.
  const matchingTopic = await prisma.topic.findFirst({
    where: {
      name: { equals: output.canonicalTopic, mode: "insensitive" },
      ...(validated.section ? { section: validated.section } : {}),
      ...(beckerUnit ? { unit: beckerUnit } : {}),
    },
  });

  const topic = matchingTopic ?? (
    validated.section
      ? await prisma.topic.create({
          data: {
            section: validated.section,
            name: output.canonicalTopic,
            unit: beckerUnit ?? (output.subsection || null),
          },
        })
      : null
  );

  if (topic) {
    await prisma.chunk.update({
      where: { id: validated.chunkId },
      data: { topicId: topic.id },
    });
  }

  return output;
}
