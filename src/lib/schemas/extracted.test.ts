import { describe, expect, it } from "vitest";
import { ExtractedQuestion, ExtractedQuestionIncomplete } from "./extracted";

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

  it("allows null answers and explanations when choices are known", () => {
    const parsed = ExtractedQuestion.parse({
      question: "q",
      choices: [
        { label: "A", text: "answer 1" },
        { label: "B", text: "answer 2" },
      ],
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

  it("rejects empty choices for a complete extraction", () => {
    const result = ExtractedQuestion.safeParse({
      question: "q",
      choices: [],
      userAnswer: null,
      correctAnswer: null,
      beckerExplanation: null,
      section: "FAR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate choice labels", () => {
    const result = ExtractedQuestion.safeParse({
      question: "q",
      choices: [
        { label: "A", text: "answer 1" },
        { label: "A", text: "answer 2" },
      ],
      userAnswer: "A",
      correctAnswer: "A",
      beckerExplanation: null,
      section: "FAR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects answers that do not match provided choices", () => {
    const result = ExtractedQuestion.safeParse({
      question: "q",
      choices: [
        { label: "A", text: "answer 1" },
        { label: "B", text: "answer 2" },
      ],
      userAnswer: "C",
      correctAnswer: "B",
      beckerExplanation: null,
      section: "FAR",
    });
    expect(result.success).toBe(false);
  });

  it("keeps incomplete extraction permissive for partial model output", () => {
    const parsed = ExtractedQuestionIncomplete.parse({
      incomplete: true,
      reason: "feedback view was not visible",
      question: "partial question",
      choices: [{ label: "unknown" }],
      userAnswer: "Z",
    });
    expect(parsed.incomplete).toBe(true);
  });
});
