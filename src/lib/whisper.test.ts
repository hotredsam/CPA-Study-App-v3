import { describe, expect, it } from "vitest";
import { normalizeResult } from "./whisper";

describe("normalizeResult", () => {
  it("maps segments with token-level words", () => {
    const out = normalizeResult([
      {
        start: 0,
        end: 2,
        text: "hello world",
        tokens: [
          { start: 0, end: 1, text: " hello" },
          { start: 1, end: 2, word: "world" },
        ],
      },
    ]);
    expect(out.language).toBe("en");
    expect(out.segments).toHaveLength(1);
    const segment = out.segments[0];
    if (!segment) throw new Error("expected a segment");
    expect(segment.words).toEqual([
      { start: 0, end: 1, word: "hello" },
      { start: 1, end: 2, word: "world" },
    ]);
  });

  it("handles segments with no token array", () => {
    const out = normalizeResult([{ start: 0, end: 1, text: "hmm" }]);
    const segment = out.segments[0];
    if (!segment) throw new Error("expected a segment");
    expect(segment.words).toEqual([]);
  });
});
