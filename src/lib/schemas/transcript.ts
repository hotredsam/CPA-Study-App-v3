import { z } from "zod";

export const TranscriptWord = z.object({
  start: z.number(),
  end: z.number(),
  word: z.string(),
  probability: z.number().min(0).max(1).optional(),
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
  durationSec: z.number().min(0).optional(),
  noSpeechDetected: z.boolean().optional(),
});
export type Transcript = z.infer<typeof Transcript>;
