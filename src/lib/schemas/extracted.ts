import { z } from "zod";

export const CpaSection = z.enum(["AUD", "FAR", "REG", "TCP"]);
export type CpaSection = z.infer<typeof CpaSection>;

export const Choice = z.object({
  label: z.string().min(1),
  text: z.string(),
});

export const ExtractedQuestion = z.object({
  question: z.string().min(1),
  choices: z.array(Choice),
  userAnswer: z.string().nullable(),
  correctAnswer: z.string().nullable(),
  beckerExplanation: z.string().nullable(),
  section: CpaSection.nullable(),
});
export type ExtractedQuestion = z.infer<typeof ExtractedQuestion>;

export const ExtractedQuestionIncomplete = ExtractedQuestion.partial().extend({
  incomplete: z.literal(true),
  reason: z.string(),
});
export type ExtractedQuestionIncomplete = z.infer<typeof ExtractedQuestionIncomplete>;
