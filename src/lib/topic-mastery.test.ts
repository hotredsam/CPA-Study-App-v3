import { describe, expect, it } from "vitest";
import { computeTopicMasteryMetrics } from "./topic-mastery";

const NOW = new Date("2026-05-06T12:00:00.000Z");

describe("computeTopicMasteryMetrics", () => {
  it("uses linked chunk references to correct topic unit labels", () => {
    const metrics = computeTopicMasteryMetrics({
      section: "FAR",
      storedUnit: "Balance Sheet Structure",
      chunks: [
        {
          chapterRef: "F1 M1 - Pages 1-5",
          title: "F1 M1 - Pages 1-5",
          textbook: { title: "FAR F1" },
        },
      ],
      cards: [],
      questions: [],
      now: NOW,
    });

    expect(metrics.unit).toBe("F1");
    expect(metrics.mastery).toBe(0);
    expect(metrics.evidence.confidence).toBe("none");
  });

  it("blends graded question performance with reviewed card recall", () => {
    const metrics = computeTopicMasteryMetrics({
      section: "FAR",
      storedUnit: "F1",
      chunks: [],
      cards: [
        {
          srsState: { nextDue: "2026-05-08T12:00:00.000Z", repetitions: 4, lapses: 0 },
          reviews: [{ rating: "EASY", reviewedAt: new Date("2026-05-05T12:00:00.000Z") }],
        },
        {
          srsState: { nextDue: "2026-05-03T12:00:00.000Z", repetitions: 2, lapses: 1 },
          reviews: [{ rating: "GOOD", reviewedAt: new Date("2026-05-04T12:00:00.000Z") }],
        },
      ],
      questions: [
        {
          createdAt: new Date("2026-05-05T12:00:00.000Z"),
          feedback: { accountingScore: 8.5, combinedScore: 8 },
        },
      ],
      now: NOW,
    });

    expect(metrics.mastery).toBeGreaterThan(70);
    expect(metrics.errorRate).toBeGreaterThan(0);
    expect(metrics.cardsDue).toBe(1);
    expect(metrics.lastSeen?.toISOString()).toBe("2026-05-05T12:00:00.000Z");
    expect(metrics.evidence).toMatchObject({
      cardsTotal: 2,
      cardsReviewed: 2,
      questionsGraded: 1,
      confidence: "medium",
    });
  });

  it("caps mastery when one evidence stream is below readiness threshold", () => {
    const metrics = computeTopicMasteryMetrics({
      section: "REG",
      storedUnit: "R1",
      chunks: [],
      cards: [
        {
          srsState: { nextDue: "2026-05-09T12:00:00.000Z", repetitions: 5, lapses: 0 },
          reviews: [{ rating: "EASY", reviewedAt: new Date("2026-05-05T12:00:00.000Z") }],
        },
      ],
      questions: [
        {
          createdAt: new Date("2026-05-06T12:00:00.000Z"),
          feedback: { accountingScore: 5, combinedScore: 5 },
        },
      ],
      now: NOW,
    });

    expect(metrics.mastery).toBeLessThanOrEqual(80);
  });
});
