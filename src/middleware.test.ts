import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { resetRateLimitsForTests } from "@/lib/security/rate-limit";
import { middleware } from "./middleware";

const ENV_KEYS = [
  "AUTH_REQUIRED",
  "AUTH_BYPASS",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_ALLOWED_EMAILS",
  "VERCEL",
] as const;

function restoreEnv(saved: Map<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function signedRequest(args: { url: string; method: string; headers?: HeadersInit }): Promise<NextRequest> {
  const token = await createSessionToken({
    email: "hotredsam@gmail.com",
    secret: "test-secret",
    nowMs: Date.UTC(2026, 4, 11),
  });
  return new NextRequest(args.url, {
    method: args.method,
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      ...args.headers,
    },
  });
}

describe("middleware security gates", () => {
  let savedEnv: Map<string, string | undefined>;

  beforeEach(() => {
    savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
    process.env["AUTH_REQUIRED"] = "true";
    process.env["AUTH_SECRET"] = "test-secret";
    process.env["AUTH_GOOGLE_ID"] = "client-id";
    process.env["AUTH_GOOGLE_SECRET"] = "client-secret";
    process.env["AUTH_ALLOWED_EMAILS"] = "hotredsam@gmail.com";
    delete process.env["AUTH_BYPASS"];
    delete process.env["VERCEL"];
    resetRateLimitsForTests();
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    resetRateLimitsForTests();
  });

  it("blocks signed-in cross-site writes to protected API routes", async () => {
    const request = await signedRequest({
      url: "https://app.example.com/api/settings/openrouter-key",
      method: "POST",
      headers: { origin: "https://evil.example" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "CSRF_BLOCKED", message: "Cross-site request blocked." },
    });
  });

  it("allows signed-in same-origin writes to protected API routes", async () => {
    const request = await signedRequest({
      url: "https://app.example.com/api/settings/openrouter-key",
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
