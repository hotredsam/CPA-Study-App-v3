import { z } from "zod";

export const Stage = z.enum([
  "uploading",
  "segmenting",
  "extracting",
  "transcribing",
  "tagging",
  "grading",
]);
export type Stage = z.infer<typeof Stage>;

export const StageProgress = z.object({
  stage: Stage,
  pct: z.number().min(0).max(100),
  etaSec: z.number().int().min(0).optional(),
  message: z.string().min(1),
  sub: z
    .object({
      current: z.number().int().min(0),
      total: z.number().int().min(0),
      itemLabel: z.string().optional(),
    })
    .optional(),
  subProgress: z.record(z.number().min(0).max(100)).optional(),
});

export type StageProgress = z.infer<typeof StageProgress>;
