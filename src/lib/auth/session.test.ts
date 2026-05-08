import { describe, expect, it } from "vitest";
import { createSessionToken, getConfiguredLoginUsername, isAuthConfigured, shouldRequireAuth, verifySessionToken } from "./session";

describe("auth sessions", () => {
  it("round-trips a signed session token", async () => {
    const token = await createSessionToken({
      username: "sam",
      secret: "test-secret",
      nowMs: 1_000,
    });
    const session = await verifySessionToken(token, "test-secret", 2_000);

    expect(session?.username).toBe("sam");
  });

  it("rejects expired or incorrectly signed tokens", async () => {
    const token = await createSessionToken({
      username: "sam",
      secret: "test-secret",
      ttlSeconds: 1,
      nowMs: 1_000,
    });

    await expect(verifySessionToken(token, "wrong-secret", 1_500)).resolves.toBeNull();
    await expect(verifySessionToken(token, "test-secret", 3_000)).resolves.toBeNull();
  });

  it("accepts username auth config and legacy email config", () => {
    expect(
      isAuthConfigured({
        AUTH_SECRET: "secret",
        APP_LOGIN_USERNAME: "sam",
        APP_LOGIN_PASSWORD_HASH: "hash",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      getConfiguredLoginUsername({
        APP_LOGIN_EMAIL: "sam@example.com",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("sam@example.com");
  });

  it("requires auth on Vercel or when explicitly enabled", () => {
    expect(shouldRequireAuth({ VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_REQUIRED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_BYPASS: "true", VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
