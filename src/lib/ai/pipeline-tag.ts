import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const PipelineTagInput = z.object({
  questionId: z.string(),
  transcript: z.string().nullable(),
  extractedText: z.string().nullable(),
});

export const PipelineTagOutput = z.object({
  section: z.string(),
  unit: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type PipelineTagInput = z.infer<typeof PipelineTagInput>;
export type PipelineTagOutput = z.infer<typeof PipelineTagOutput>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: PipelineTagInput): string {
  const parts: string[] = [
    "You are a CPA exam content tagger. Given this question transcript and extracted text, identify the CPA exam section (AUD/FAR/REG/TCP), unit (a broad subtopic within that section), topic (specific concept), and difficulty. Return JSON only.",
    "",
  ];

  if (input.transcript) {
    parts.push(`Transcript:\n${input.transcript}`);
    parts.push("");
  }

  if (input.extractedText) {
    parts.push(`Extracted Question Text:\n${input.extractedText}`);
    parts.push("");
  }

  parts.push(
    'Return exactly this JSON shape: {"section":"FAR","unit":"Revenue Recognition","topic":"ASC 606 Step 3","difficulty":"medium"}',
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runPipelineTag(input: PipelineTagInput): Promise<PipelineTagOutput> {
  const validated = PipelineTagInput.parse(input);

  const result = await runFunction(AiFunctionKey.PIPELINE_TAG, {
    prompt: buildPrompt(validated),
    questionId: validated.questionId,
  });

  const output = PipelineTagOutput.parse(result.output);

  // Write Question.topicId if a matching Topic exists (case-insensitive name match)
  const matchingTopic = await prisma.topic.findFirst({
    where: {
      name: { equals: output.topic, mode: "insensitive" },
    },
  });

  await prisma.question.update({
    where: { id: validated.questionId },
    data: {
      topicId: matchingTopic?.id ?? undefined,
      tags: {
        section: output.section,
        unit: output.unit,
        topic: output.topic,
        difficulty: output.difficulty,
      },
      taggedAt: new Date(),
    },
  });

  return output;
}
