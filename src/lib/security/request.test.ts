import { describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";
import { clientIpFromHeaders, hasTrustedSameOrigin, isStateChangingMethod } from "./request";

describe("security request helpers", () => {
  it("identifies state-changing HTTP methods", () => {
    expect(isStateChangingMethod("GET")).toBe(false);
    expect(isStateChangingMethod("HEAD")).toBe(false);
    expect(isStateChangingMethod("POST")).toBe(true);
    expect(isStateChangingMethod("delete")).toBe(true);
  });

  it("extracts the first forwarded client IP", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.2" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.5");
  });

  it("accepts same-origin origin or referer headers", () => {
    expect(
      hasTrustedSameOrigin(
        new Request("https://app.example.com/api/settings", {
          method: "POST",
          headers: { origin: "https://app.example.com" },
        }),
      ),
    ).toBe(true);

    expect(
      hasTrustedSameOrigin(
        new Request("https://app.example.com/api/settings", {
          method: "POST",
          headers: { referer: "https://app.example.com/settings" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing or cross-site origin evidence", () => {
    expect(hasTrustedSameOrigin(new Request("https://app.example.com/api/settings"))).toBe(false);
    expect(
      hasTrustedSameOrigin(
        new Request("https://app.example.com/api/settings", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
  });

  it("limits repeated requests within a window", () => {
    resetRateLimitsForTests();
    expect(checkRateLimit({ key: "test", limit: 2, windowMs: 10_000, nowMs: 1_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "test", limit: 2, windowMs: 10_000, nowMs: 1_100 }).allowed).toBe(true);
    const blocked = checkRateLimit({ key: "test", limit: 2, windowMs: 10_000, nowMs: 1_200 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(10);
    expect(checkRateLimit({ key: "test", limit: 2, windowMs: 10_000, nowMs: 11_001 }).allowed).toBe(true);
  });
});
