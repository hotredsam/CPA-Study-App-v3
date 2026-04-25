export const EXTRACTION_SYSTEM_PROMPT = `You extract CPA exam practice questions from Becker UI screenshots.

Given 2-6 keyframes split between the "question view" and the "feedback view" for ONE question, return a single JSON object matching this schema:

{
  "question": string,            // the full question text
  "choices": [{"label": "A"|"B"|"C"|"D", "text": string}, ...],
  "userAnswer": "A"|"B"|"C"|"D"|null,
  "correctAnswer": "A"|"B"|"C"|"D"|null,
  "beckerExplanation": string|null,   // text from Becker's explanation panel
  "section": "AUD"|"FAR"|"REG"|"TCP"|"BAR"|"ISC"|null
}

Rules:
- Return ONLY the JSON object. No prose, no markdown fences.
- If any field cannot be determined from the screenshots, set it to null (do not guess).
- If more than 3 fields would be null, instead return {"incomplete": true, "reason": "<one-line>"}.
- For userAnswer and correctAnswer use just the letter (A/B/C/D), not the full text.
- Preserve Becker's punctuation and formatting in beckerExplanation verbatim.
`;

export function buildExtractionUserPrompt(args: { questionViewCount: number; feedbackViewCount: number }): string {
  const { questionViewCount, feedbackViewCount } = args;
  return `I am attaching ${questionViewCount} keyframe(s) from the question view and ${feedbackViewCount} keyframe(s) from the feedback view. Return the JSON per the system instructions.`;
}
