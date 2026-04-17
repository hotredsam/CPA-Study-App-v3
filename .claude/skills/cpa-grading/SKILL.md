---
name: cpa-grading
description: Grading prompt template, 10-item feedback schema, scoring math, and Zod validation for the grader's Claude response. Use for Task 7 and any code that consumes Feedback rows.
---

# CPA Grading

One Claude Sonnet 4.6 call per question. Inputs: extracted question payload + user's transcript. Outputs: 10 structured feedback items + 3 scores.

## 10-item feedback schema (placeholders until Sam locks exact items)

Sam is still finalizing the exact wording of the 10 items. The schema below uses TBD labels — Task 7's planner prompt must read `sam-input/TODO.xml` for any `<item kind="lock-feedback-items">` entry before freezing this.

```ts
import { z } from "zod";

export const FeedbackItem = z.object({
  key: z.enum([
    "knowledgeAccuracy",        // TBD-1
    "reasoningChain",           // TBD-2
    "consultingClarity",        // TBD-3
    "useOfTerminology",         // TBD-4
    "acknowledgedUncertainty",  // TBD-5
    "connectedToFramework",     // TBD-6
    "identifiedKeyFacts",       // TBD-7
    "rebuttedDistractors",      // TBD-8
    "synthesizedExplanation",   // TBD-9
    "nextStudyRecommendation",  // TBD-10
  ]),
  label: z.string(),        // human label for UI
  score: z.number().min(0).max(10),
  rationale: z.string(),    // 1-3 sentences
  evidence: z.array(z.string()).max(3), // direct quotes from transcript / question
});

export const FeedbackPayload = z.object({
  items: z.array(FeedbackItem).length(10),
  scores: z.object({
    accounting: z.number().min(0).max(10),
    consulting: z.number().min(0).max(10),
    combined: z.number().min(0).max(10),
  }),
  whatYouNeedToLearn: z.string().nullable(), // null if they got it right and sounded confident
  weakTopicTags: z.array(z.string()).max(5),
});
```

## Scoring math

- `accounting` = weighted mean of items `{1,2,6,7,8,9}` (accounting-weighted subset).
- `consulting` = weighted mean of items `{3,4,5,9,10}` (consulting-weighted subset).
- `combined` = `0.6 * accounting + 0.4 * consulting` unless Sam's settings override the weighting.

These weights are placeholders mirroring the TBD items; when Sam locks items, update the weight map in `src/lib/grading/weights.ts`.

## Prompt template

```
You are grading a CPA student's spoken reasoning on a practice question from Becker.

INPUT:
  Question: {{extracted.question}}
  Choices: {{extracted.choices}}
  Student's answer: {{extracted.userAnswer}}
  Correct answer: {{extracted.correctAnswer}}
  Becker's explanation: {{extracted.beckerExplanation}}
  Student's spoken reasoning (with timestamps):
{{transcript.segments}}

TASK:
  Score each of the 10 items below, each from 0 to 10.
  For each item, cite 1–3 direct quotes from the spoken reasoning as evidence.
  If the student got the answer wrong or expressed uncertainty, produce a 1-paragraph "What you need to learn" summary.
  Identify up to 5 weak-topic tags (e.g., ["GAAP-ASC-606", "revenue-recognition"]).

Return ONLY JSON matching this schema: [FeedbackPayload]
```

## Validation

On task side: parse with `FeedbackPayload.safeParse`. On failure:
1. Retry once with `Previous output did not validate. Errors: {{zodError}}. Return ONLY valid JSON.`
2. If still failing, throw `NonRetriableError` (don't chew retry budget).

## Zod → DB

`FeedbackPayload` → `Feedback.items` JSON column + `Feedback.accountingScore`, `Feedback.consultingScore`, `Feedback.combinedScore` top-level columns for query performance.

## Do not

- Do not add items beyond the 10. If Sam wants more, he locks new keys in `sam-input/TODO.xml` and the migration updates the enum.
- Do not call OpenAI. Claude Sonnet 4.6 only.
- Do not grade a question with `noAudio: true` on the consulting axis — set `consulting: null` and skip items 3, 4, 5, 10.
