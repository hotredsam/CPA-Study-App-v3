import { describe, expect, it } from "vitest";
import {
  createOAuthStateToken,
  createSessionToken,
  safeNextPath,
  verifyOAuthStateToken,
  verifySessionToken,
} from "./session";

describe("auth sessions", () => {
  it("round-trips a signed session token", async () => {
    const token = await createSessionToken({
      email: "Hotredsam@Gmail.com",
      secret: "test-secret",
      nowMs: 1_000,
    });
    const session = await verifySessionToken(token, "test-secret", 2_000);

    expect(session?.email).toBe("hotredsam@gmail.com");
  });

  it("rejects expired or incorrectly signed session tokens", async () => {
    const token = await createSessionToken({
      email: "hotredsam@gmail.com",
      secret: "test-secret",
      ttlSeconds: 1,
      nowMs: 1_000,
    });

    await expect(verifySessionToken(token, "wrong-secret", 1_500)).resolves.toBeNull();
    await expect(verifySessionToken(token, "test-secret", 3_000)).resolves.toBeNull();
  });

  it("round-trips an oauth state token", async () => {
    const token = await createOAuthStateToken({
      state: "state-123",
      nextPath: "/settings?tab=models",
      secret: "test-secret",
      nowMs: 1_000,
    });

    await expect(verifyOAuthStateToken(token, "test-secret", 2_000)).resolves.toMatchObject({
      state: "state-123",
      nextPath: "/settings?tab=models",
    });
  });

  it("normalizes unsafe next paths", () => {
    expect(safeNextPath("/topics")).toBe("/topics");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
