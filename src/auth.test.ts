import { describe, expect, it } from "vitest";
import { getAllowedAuthEmails, isAllowedAuthEmail, isGoogleAuthConfigured, shouldRequireAuth } from "./lib/auth/google";

describe("google auth config", () => {
  it("defaults access to Sam's Google account only", () => {
    expect(getAllowedAuthEmails({} as unknown as NodeJS.ProcessEnv)).toEqual(["hotredsam@gmail.com"]);
    expect(isAllowedAuthEmail("hotredsam@gmail.com", {} as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isAllowedAuthEmail("other@example.com", {} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("supports comma-separated allowlist overrides", () => {
    const env = { AUTH_ALLOWED_EMAILS: "hotredsam@gmail.com, backup@example.com " } as unknown as NodeJS.ProcessEnv;

    expect(isAllowedAuthEmail("BACKUP@example.com", env)).toBe(true);
  });

  it("requires a session secret and Google OAuth credentials", () => {
    expect(
      isGoogleAuthConfigured({
        AUTH_SECRET: "secret",
        AUTH_GOOGLE_ID: "client-id",
        AUTH_GOOGLE_SECRET: "client-secret",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(isGoogleAuthConfigured({ AUTH_SECRET: "secret" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("requires auth on Vercel or when explicitly enabled", () => {
    expect(shouldRequireAuth({ VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ NODE_ENV: "production", AUTH_BYPASS: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_REQUIRED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(shouldRequireAuth({ AUTH_BYPASS: "true" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldRequireAuth({
      NODE_ENV: "production",
      AUTH_BYPASS: "true",
      ALLOW_LOCAL_PROD_AUTH_BYPASS: "true",
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldRequireAuth({ AUTH_BYPASS: "true", VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
