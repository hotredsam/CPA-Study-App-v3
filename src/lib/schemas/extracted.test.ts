import { describe, expect, it } from "vitest";
import { ExtractedQuestion } from "./extracted";

describe("ExtractedQuestion", () => {
  it("parses a fully-populated question", () => {
    const parsed = ExtractedQuestion.parse({
      question: "Which of the following...",
      choices: [
        { label: "A", text: "answer 1" },
        { label: "B", text: "answer 2" },
      ],
      userAnswer: "A",
      correctAnswer: "B",
      beckerExplanation: "because 2 > 1",
      section: "FAR",
    });
    expect(parsed.section).toBe("FAR");
    expect(parsed.choices).toHaveLength(2);
  });

  it("allows null answers and explanations", () => {
    const parsed = ExtractedQuestion.parse({
      question: "q",
      choices: [],
      userAnswer: null,
      correctAnswer: null,
      beckerExplanation: null,
      section: null,
    });
    expect(parsed.userAnswer).toBeNull();
  });

  it("rejects an unknown section", () => {
    const result = ExtractedQuestion.safeParse({
      question: "q",
      choices: [],
      userAnswer: null,
      correctAnswer: null,
      beckerExplanation: null,
      section: "TAX",
    });
    expect(result.success).toBe(false);
  });
});
