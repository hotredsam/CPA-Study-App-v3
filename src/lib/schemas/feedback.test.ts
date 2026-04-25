import { describe, expect, it } from "vitest";
import { FeedbackPayload, FeedbackItem, PROVISIONAL_RUBRIC_KEYS } from "./feedback";

describe("FeedbackPayload", () => {
  it("accepts a payload with all 10 rubric items", () => {
    const parsed = FeedbackPayload.parse({
      items: PROVISIONAL_RUBRIC_KEYS.map((item) => ({
        key: item.key,
        label: item.label,
        comment: "clear",
        score: 8,
      })),
      accountingScore: 7,
      consultingScore: 8,
      combinedScore: 7.5,
      whatYouNeedToLearn: "deferred tax",
      weakTopicTags: ["deferred-tax", "consulting-brevity"],
    });
    expect(parsed.items).toHaveLength(10);
    expect(parsed.combinedScore).toBeCloseTo(7.5);
  });

  it("accepts FeedbackItem with provisional flag", () => {
    const parsed = FeedbackItem.parse({
      key: "acc-conceptual-understanding",
      comment: "needs review",
      provisional: true,
    });
    expect(parsed.provisional).toBe(true);
  });

  it("PROVISIONAL_RUBRIC_KEYS has exactly 5 accounting and 5 consulting keys", () => {
    const accounting = PROVISIONAL_RUBRIC_KEYS.filter((k) => k.domain === "accounting");
    const consulting  = PROVISIONAL_RUBRIC_KEYS.filter((k) => k.domain === "consulting");
    expect(accounting).toHaveLength(5);
    expect(consulting).toHaveLength(5);
    expect(PROVISIONAL_RUBRIC_KEYS).toHaveLength(10);
  });

  it("PROVISIONAL_RUBRIC_KEYS keys are unique", () => {
    const keys = PROVISIONAL_RUBRIC_KEYS.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("rejects a score out of range", () => {
    const result = FeedbackPayload.safeParse({
      items: PROVISIONAL_RUBRIC_KEYS.map((item) => ({
        key: item.key,
        label: item.label,
        comment: "clear",
      })),
      accountingScore: 11,
      consultingScore: 5,
      combinedScore: 5,
      whatYouNeedToLearn: null,
      weakTopicTags: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing rubric items", () => {
    const result = FeedbackPayload.safeParse({
      items: PROVISIONAL_RUBRIC_KEYS.slice(0, 9).map((item) => ({
        key: item.key,
        label: item.label,
        comment: "clear",
      })),
      accountingScore: 7,
      consultingScore: 8,
      combinedScore: 7.5,
      whatYouNeedToLearn: null,
      weakTopicTags: [],
    });
    expect(result.success).toBe(false);
  });
});
