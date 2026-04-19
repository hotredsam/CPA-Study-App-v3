import { z } from "zod";
import { AiFunctionKey } from "@prisma/client";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const CheckpointQuizInput = z.object({
  chunkId: z.string(),
  content: z.string(),
  topicName: z.string().optional(),
});

const QuizQuestion = z.object({
  stem: z.string(),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  rationale: z.string(),
  distractorQualityNote: z.string(),
});

export const CheckpointQuizOutput = z.object({
  questions: z.array(QuizQuestion).min(1),
});

export type CheckpointQuizInput = z.infer<typeof CheckpointQuizInput>;
export type CheckpointQuizOutput = z.infer<typeof CheckpointQuizOutput>;
export type QuizQuestion = z.infer<typeof QuizQuestion>;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: CheckpointQuizInput): string {
  const parts: string[] = [
    "Generate 3-5 multiple choice CPA exam practice questions for this textbook chunk. Each question should have a stem, 4 choices, the correctIndex (0-based), a rationale, and a distractorQualityNote. Return JSON.",
    "",
  ];

  if (input.topicName) {
    parts.push(`Topic: ${input.topicName}`);
    parts.push("");
  }

  parts.push("Chunk Content:");
  parts.push(input.content);
  parts.push("");
  parts.push(
    'Return exactly this JSON shape: {"questions":[{"stem":"Which of the following...","choices":["A","B","C","D"],"correctIndex":0,"rationale":"Because...","distractorQualityNote":"B is plausible because..."}]}',
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runCheckpointQuiz(
  input: CheckpointQuizInput,
): Promise<CheckpointQuizOutput> {
  const validated = CheckpointQuizInput.parse(input);

  const result = await runFunction(AiFunctionKey.CHECKPOINT_QUIZ, {
    prompt: buildPrompt(validated),
    chunkId: validated.chunkId,
  });

  return CheckpointQuizOutput.parse(result.output);
}
