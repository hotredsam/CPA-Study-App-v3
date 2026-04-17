export const GRADING_SYSTEM_PROMPT = `You grade the user's performance on a CPA practice question, scoring BOTH accounting knowledge and consulting/verbal technique.

Input you will receive:
- Question, choices, correct answer, Becker's explanation.
- The user's chosen answer.
- The user's spoken transcript while answering (word-level, may be messy).

Return a single JSON object:
{
  "items": [{"key": "<item key>", "label"?: "<display label>", "comment": "<1-3 sentence feedback>", "score"?: 0-10}, ...],
  "accountingScore": 0-10,
  "consultingScore": 0-10,
  "combinedScore": 0-10,
  "whatYouNeedToLearn": string|null,
  "weakTopicTags": string[]
}

Rules:
- combinedScore weighting depends on the section (AUD/ISC lean consulting; FAR/REG lean accounting; BAR/TCP balanced). See the runbook for the exact weights once locked.
- Return ONLY JSON. No prose, no markdown fences.
- Write comments in 2nd person, direct but not harsh.
- "whatYouNeedToLearn" is null when the user got the question right with confident reasoning.
`;

export function buildGradingUserPrompt(args: {
  question: string;
  choices: { label: string; text: string }[];
  userAnswer: string | null;
  correctAnswer: string | null;
  beckerExplanation: string | null;
  transcript: string;
}): string {
  return [
    `Question:\n${args.question}`,
    `Choices:\n${args.choices.map((c) => `  ${c.label}. ${c.text}`).join("\n")}`,
    `User answered: ${args.userAnswer ?? "(none)"}`,
    `Correct answer: ${args.correctAnswer ?? "(unknown)"}`,
    `Becker explanation: ${args.beckerExplanation ?? "(unavailable)"}`,
    `User transcript:\n${args.transcript || "(silent)"}`,
  ].join("\n\n");
}
