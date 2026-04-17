import { z } from "zod";

export const TranscriptWord = z.object({
  start: z.number(),
  end: z.number(),
  word: z.string(),
});

export const TranscriptSegment = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  words: z.array(TranscriptWord).default([]),
});

export const Transcript = z.object({
  segments: z.array(TranscriptSegment),
  language: z.string().default("en"),
});
export type Transcript = z.infer<typeof Transcript>;
