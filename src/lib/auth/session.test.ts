import { describe, expect, it } from "vitest";
import { createSessionToken, shouldRequireAuth, verifySessionToken } from "./session";

describe("auth sessions", () => {
  it("round-trips a signed session token", async () => {
    const token = await createSessionToken({
      email: "sam@example.com",
      secret: "test-secret",
      nowMs: 1_000,
    });
    const session = await verifySessionToken(token, "test-secret", 2_000);

    expect(session?.email).toBe("sam@example.com");
  });

  it("rejects expired or incorrectly signed tokens", async () => {
    const token = await createSessionToken({
      email: "sam@example.com",
      secret: "test-secret",
      ttlSeconds: 1,
      nowMs: 1_000,
    });

    await expect(verifySessionToken(token, "wrong-secret", 1_500)).resolves.toBeNull();
    await expect(verifySessionToken(token, "test-secret", 3_000)).resolves.toBeNull();
  });

  it("requires auth on Vercel or when explicitly enabled", () => {
    expect(shouldRequireAuth({ VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_REQUIRED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_BYPASS: "true", VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
