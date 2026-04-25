import { z } from "zod";

// Placeholder rubric keys used until the user finalises the real 10 keys.
// Keys marked provisional:true are surfaced with a badge in the Review UI.
// Replace these with real keys once locked — see blockers/2026-04-17-feedback-items.md
export const PROVISIONAL_RUBRIC_KEYS: Array<{ key: string; label: string; domain: "accounting" | "consulting" }> = [
  { key: "acc-conceptual-understanding", label: "Conceptual Understanding", domain: "accounting" },
  { key: "acc-application-accuracy",    label: "Application Accuracy",     domain: "accounting" },
  { key: "acc-standard-citation",       label: "Standard Citation",        domain: "accounting" },
  { key: "acc-calculation-mechanics",   label: "Calculation Mechanics",    domain: "accounting" },
  { key: "acc-journal-entry",           label: "Journal Entry",            domain: "accounting" },
  { key: "con-risk-identification",     label: "Risk Identification",      domain: "consulting" },
  { key: "con-professional-judgement",  label: "Professional Judgement",   domain: "consulting" },
  { key: "con-communication-clarity",   label: "Communication Clarity",    domain: "consulting" },
  { key: "con-synthesis",               label: "Synthesis",                domain: "consulting" },
  { key: "con-recommendation-quality",  label: "Recommendation Quality",   domain: "consulting" },
];

const RUBRIC_KEYS = [
  "acc-conceptual-understanding",
  "acc-application-accuracy",
  "acc-standard-citation",
  "acc-calculation-mechanics",
  "acc-journal-entry",
  "con-risk-identification",
  "con-professional-judgement",
  "con-communication-clarity",
  "con-synthesis",
  "con-recommendation-quality",
] as const;

export const FeedbackItem = z.object({
  key: z.enum(RUBRIC_KEYS),
  label: z.string().optional(),
  comment: z.string(),
  score: z.number().min(0).max(10).optional(),
  provisional: z.boolean().optional(),
});
export type FeedbackItem = z.infer<typeof FeedbackItem>;

export const FeedbackPayload = z.object({
  items: z.array(FeedbackItem).length(RUBRIC_KEYS.length),
  accountingScore: z.number().min(0).max(10),
  consultingScore: z.number().min(0).max(10),
  combinedScore: z.number().min(0).max(10),
  whatYouNeedToLearn: z.string().nullable(),
  weakTopicTags: z.array(z.string()),
}).superRefine((payload, ctx) => {
  const seen = new Set(payload.items.map((item) => item.key));

  if (seen.size !== payload.items.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "FeedbackPayload must contain each rubric key exactly once",
    });
  }

  for (const key of RUBRIC_KEYS) {
    if (!seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: `FeedbackPayload is missing rubric key: ${key}`,
      });
    }
  }
});
export type FeedbackPayload = z.infer<typeof FeedbackPayload>;
