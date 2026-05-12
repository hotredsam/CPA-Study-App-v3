import { z } from "zod";
import { AiFunctionKey, CpaSection } from "@prisma/client";
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
  section: z.nativeEnum(CpaSection),
  unit: z.string().regex(/^[ABFRIST]\d{1,2}$/),
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
    "You are a CPA exam content tagger. Given this question transcript and extracted text, identify the CPA exam section (AUD/FAR/REG/TCP/BAR/ISC), Becker-style unit code when inferable (for example F1, R1, A1, T1, B1, S1), topic (specific concept), and difficulty. Return JSON only.",
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
    'Return exactly this JSON shape: {"section":"FAR","unit":"F1","topic":"ASC 606 Step 3","difficulty":"medium"}',
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
  }, {
    questionId: validated.questionId,
  });

  const output = PipelineTagOutput.parse(result.output);

  // Write Question.topicId only when the topic matches inside the same CPA section.
  const matchingTopic = await prisma.topic.findFirst({
    where: {
      section: output.section,
      name: { equals: output.topic, mode: "insensitive" },
    },
  });
  const unit = matchingTopic?.unit ?? output.unit;

  await prisma.question.update({
    where: { id: validated.questionId },
    data: {
      section: output.section,
      topicId: matchingTopic?.id ?? undefined,
      tags: {
        section: output.section,
        unit,
        topic: output.topic,
        difficulty: output.difficulty,
      },
      taggedAt: new Date(),
    },
  });

  return { ...output, unit };
}
