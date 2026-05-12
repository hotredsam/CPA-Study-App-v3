import { z } from "zod";
import { CPA_SECTION_OPTIONS } from "@/lib/cpa-sections";

export const CpaSection = z.enum(CPA_SECTION_OPTIONS);
export type CpaSection = z.infer<typeof CpaSection>;

const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

export const Choice = z.object({
  label: z.enum(ANSWER_LABELS),
  text: z.string().min(1),
});

export const ExtractedQuestion = z.object({
  question: z.string().min(1),
  choices: z.array(Choice).min(2),
  userAnswer: z.enum(ANSWER_LABELS).nullable(),
  correctAnswer: z.enum(ANSWER_LABELS).nullable(),
  beckerExplanation: z.string().nullable(),
  section: CpaSection.nullable(),
}).superRefine((payload, ctx) => {
  const labels = payload.choices.map((choice) => choice.label);
  const uniqueLabels = new Set(labels);

  if (uniqueLabels.size !== labels.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["choices"],
      message: "choices must use each answer label at most once",
    });
  }

  for (const [field, answer] of [
    ["userAnswer", payload.userAnswer],
    ["correctAnswer", payload.correctAnswer],
  ] as const) {
    if (answer !== null && !uniqueLabels.has(answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} must match one of the provided choice labels`,
      });
    }
  }
});
export type ExtractedQuestion = z.infer<typeof ExtractedQuestion>;

const PartialChoice = z.object({
  label: z.string().min(1),
  text: z.string().optional(),
});

export const ExtractedQuestionIncomplete = z.object({
  question: z.string().min(1).optional(),
  choices: z.array(PartialChoice).optional(),
  userAnswer: z.string().nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  beckerExplanation: z.string().nullable().optional(),
  section: CpaSection.nullable().optional(),
  incomplete: z.literal(true),
  reason: z.string().min(1),
});
export type ExtractedQuestionIncomplete = z.infer<typeof ExtractedQuestionIncomplete>;
