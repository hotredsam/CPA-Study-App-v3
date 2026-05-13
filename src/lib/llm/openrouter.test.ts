import { describe, expect, it } from "vitest";
import { estimateOpenRouterCostUsd } from "./openrouter";

describe("estimateOpenRouterCostUsd", () => {
  it("uses Haiku 4.5 OpenRouter pricing", () => {
    expect(estimateOpenRouterCostUsd("anthropic/claude-haiku-4.5", 1_000_000, 1_000_000)).toBe(6);
  });

  it("uses Sonnet 4.6 OpenRouter pricing", () => {
    expect(estimateOpenRouterCostUsd("anthropic/claude-sonnet-4.6", 1_000_000, 1_000_000)).toBe(18);
  });

  it("normalizes provider suffixes before matching known models", () => {
    expect(estimateOpenRouterCostUsd("anthropic/claude-sonnet-4.6:beta", 500_000, 100_000)).toBe(3);
  });
});
