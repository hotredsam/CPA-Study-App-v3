import { z } from "zod";

// The 10 feedback-item keys are a Phase-1 blocker — see sam-input/TODO.xml.
// Until the user locks them, the schema accepts an arbitrary keyed list so
// Task 7 can stub the grading call without blocking downstream UI work.
export const FeedbackItem = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  comment: z.string(),
  score: z.number().min(0).max(10).optional(),
});
export type FeedbackItem = z.infer<typeof FeedbackItem>;

export const FeedbackPayload = z.object({
  items: z.array(FeedbackItem),
  accountingScore: z.number().min(0).max(10),
  consultingScore: z.number().min(0).max(10),
  combinedScore: z.number().min(0).max(10),
  whatYouNeedToLearn: z.string().nullable(),
  weakTopicTags: z.array(z.string()),
});
export type FeedbackPayload = z.infer<typeof FeedbackPayload>;
