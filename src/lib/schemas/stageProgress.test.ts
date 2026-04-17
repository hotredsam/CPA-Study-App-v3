import { describe, expect, it } from "vitest";
import { StageProgress } from "./stageProgress";

describe("StageProgress schema", () => {
  it("accepts a minimum-valid payload", () => {
    const parsed = StageProgress.parse({ stage: "transcribing", pct: 42, message: "Transcribing 1/3" });
    expect(parsed.stage).toBe("transcribing");
    expect(parsed.pct).toBe(42);
  });

  it("rejects pct out of range", () => {
    const result = StageProgress.safeParse({ stage: "grading", pct: 150, message: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown stages", () => {
    const result = StageProgress.safeParse({ stage: "flying", pct: 10, message: "nope" });
    expect(result.success).toBe(false);
  });

  it("accepts optional sub progress", () => {
    const parsed = StageProgress.parse({
      stage: "extracting",
      pct: 50,
      message: "Extracting question 2 of 4",
      sub: { current: 2, total: 4, itemLabel: "keyframe 3/5" },
    });
    expect(parsed.sub?.current).toBe(2);
    expect(parsed.sub?.total).toBe(4);
  });
});
