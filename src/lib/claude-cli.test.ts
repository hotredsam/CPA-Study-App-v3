import { describe, expect, it } from "vitest";
import { extractJsonFromResponse } from "./claude-cli";

describe("extractJsonFromResponse", () => {
  it("extracts a bare JSON object", () => {
    const raw = '{"question":"What is GAAP?","choices":[],"userAnswer":null}';
    const result = extractJsonFromResponse(raw);
    expect(result).toMatchObject({ question: "What is GAAP?" });
  });

  it("extracts JSON when wrapped in prose", () => {
    const raw = 'Sure, here is the JSON:\n\n{"key":"val","score":8}\n\nHope that helps!';
    const result = extractJsonFromResponse(raw);
    expect(result).toMatchObject({ key: "val", score: 8 });
  });

  it("handles nested objects correctly", () => {
    const raw = '{"items":[{"key":"a","comment":"ok"}],"accountingScore":7,"consultingScore":8,"combinedScore":7.5,"whatYouNeedToLearn":null,"weakTopicTags":[]}';
    const result = extractJsonFromResponse(raw);
    expect((result as { accountingScore: number }).accountingScore).toBe(7);
  });

  it("handles escaped quotes inside strings", () => {
    const raw = '{"question":"Which is \\"better\\"?","choices":[]}';
    const result = extractJsonFromResponse(raw);
    expect((result as { question: string }).question).toContain("better");
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJsonFromResponse("no json here at all")).toThrow(
      /no JSON object found/
    );
  });

  it("throws when brace is never closed", () => {
    expect(() => extractJsonFromResponse('{"unclosed": "object')).toThrow(
      /no matching closing brace/
    );
  });
});
