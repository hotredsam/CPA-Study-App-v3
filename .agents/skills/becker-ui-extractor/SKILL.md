---
name: becker-ui-extractor
description: Extract structured question data from Becker CPA UI keyframes using Codex vision. Use when implementing Task 5 (question/answer extraction) or any code that converts Becker keyframe images into {question, choices, userAnswer, correctAnswer, beckerExplanation, section} JSON.
---

# Becker UI Extractor

Given a small set of keyframes (2–3 from Becker's question view, 2–3 from Becker's feedback view) for a single clip, emit strict JSON with the fields below. Codex Sonnet 4.6 vision handles this cleanly; avoid Tesseract.

## Locked JSON schema (Zod shape lives in `src/lib/extraction/schema.ts`)

```ts
const Section = z.enum(["AUD", "BEC", "FAR", "REG"]);
const Choice = z.object({ letter: z.enum(["A", "B", "C", "D"]), text: z.string() });
export const ExtractedQuestion = z.object({
  section: Section,
  question: z.string(),                 // prompt text, with \n preserved
  choices: z.array(Choice).min(2).max(8),
  userAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  beckerExplanation: z.string(),        // the full rationale panel
  confidence: z.number().min(0).max(1), // model's own 0-1 confidence
});
```

## Prompt template (verbatim)

```
You are parsing a Becker CPA question UI. You will receive:
  - up to 3 images of the QUESTION view
  - up to 3 images of the FEEDBACK (explanation) view

Return ONLY a JSON object matching the schema below. No prose.

Schema:
{
  "section": "AUD" | "BEC" | "FAR" | "REG",
  "question": string,
  "choices": [{"letter": "A"|"B"|"C"|"D", "text": string}, ...],
  "userAnswer": "A"|"B"|"C"|"D" | null,
  "correctAnswer": "A"|"B"|"C"|"D",
  "beckerExplanation": string,
  "confidence": number between 0 and 1
}

Rules:
  - If a field is not visible in any image, set it to null (except correctAnswer — if you can't see the correct answer, confidence must be below 0.5).
  - Preserve newlines in question text and beckerExplanation.
  - Do not summarize beckerExplanation — quote it.
  - If multiple images disagree, trust the feedback-view images for userAnswer and correctAnswer.
```

## Fallback rules

- If Codex returns invalid JSON → retry once with the message "Previous output was not valid JSON. Return ONLY the JSON object." If still invalid → mark the question `incomplete` (set status accordingly) and store the raw text on `Question.extracted.raw`.
- If `confidence < 0.5` → mark `incomplete` but keep the partial data for human review.
- If `correctAnswer` is missing → mark `incomplete`.

## Self-test fixtures (to be populated by Task 5 test writer)

`fixtures/becker-samples/q1.png` → expected section AUD, 4 choices, correctAnswer C (to be confirmed by Sam).

## Why no Tesseract

Becker's UI mixes rendered text, scanned images, and layout-dependent checkmarks that indicate user vs correct. Tesseract gets the text, loses the structure. Vision understands both.
