import { describe, expect, it } from "vitest";
import { FeedbackPayload } from "./feedback";

describe("FeedbackPayload", () => {
  it("accepts a payload with arbitrary keyed items", () => {
    const parsed = FeedbackPayload.parse({
      items: [
        { key: "analysis", comment: "clear" },
        { key: "method", comment: "solid", score: 8 },
      ],
      accountingScore: 7,
      consultingScore: 8,
      combinedScore: 7.5,
      whatYouNeedToLearn: "deferred tax",
      weakTopicTags: ["deferred-tax", "consulting-brevity"],
    });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.combinedScore).toBeCloseTo(7.5);
  });

  it("rejects a score out of range", () => {
    const result = FeedbackPayload.safeParse({
      items: [],
      accountingScore: 11,
      consultingScore: 5,
      combinedScore: 5,
      whatYouNeedToLearn: null,
      weakTopicTags: [],
    });
    expect(result.success).toBe(false);
  });
});
