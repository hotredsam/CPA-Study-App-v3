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

Required item keys, exactly once each:
- acc-conceptual-understanding
- acc-application-accuracy
- acc-standard-citation
- acc-calculation-mechanics
- acc-journal-entry
- con-risk-identification
- con-professional-judgement
- con-communication-clarity
- con-synthesis
- con-recommendation-quality

Rules:
- combinedScore weighting depends on the section (AUD leans consulting; FAR/REG lean accounting; TCP balanced). See the runbook for the exact weights once locked.
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
  textbookContext?: { citation: string; content: string }[];
}): string {
  const textbookContext = args.textbookContext?.length
    ? [
        "Textbook context:",
        ...args.textbookContext.map((chunk, index) => (
          `[${index + 1}] ${chunk.citation}\n${chunk.content}`
        )),
        "When textbook context is relevant, cite it in whatYouNeedToLearn with bracket references like [1].",
      ].join("\n\n")
    : "Textbook context:\n(unavailable)";

  return [
    `Question:\n${args.question}`,
    `Choices:\n${args.choices.map((c) => `  ${c.label}. ${c.text}`).join("\n")}`,
    `User answered: ${args.userAnswer ?? "(none)"}`,
    `Correct answer: ${args.correctAnswer ?? "(unknown)"}`,
    `Becker explanation: ${args.beckerExplanation ?? "(unavailable)"}`,
    textbookContext,
    `User transcript:\n${args.transcript || "(silent)"}`,
  ].join("\n\n");
}
