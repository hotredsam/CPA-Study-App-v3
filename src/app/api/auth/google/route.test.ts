import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ENV_KEYS = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_ALLOWED_EMAILS"] as const;

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

describe("GET /api/auth/google", () => {
  let savedEnv: Map<string, string | undefined>;

  beforeEach(() => {
    savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  });

  afterEach(() => {
    restoreEnv(savedEnv);
  });

  it("redirects to login setup when Google auth is not configured", async () => {
    for (const key of ENV_KEYS) delete process.env[key];

    const res = await GET(new NextRequest("http://localhost/api/auth/google?next=/settings"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?setup=missing");
  });

  it("starts Google OAuth with a signed state cookie", async () => {
    process.env["AUTH_SECRET"] = "test-secret";
    process.env["AUTH_GOOGLE_ID"] = "client-id";
    process.env["AUTH_GOOGLE_SECRET"] = "client-secret";
    process.env["AUTH_ALLOWED_EMAILS"] = "hotredsam@gmail.com";

    const res = await GET(new NextRequest("http://localhost/api/auth/google?next=/topics"));
    const location = new URL(res.headers.get("location") ?? "");

    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.pathname).toBe("/o/oauth2/v2/auth");
    expect(location.searchParams.get("client_id")).toBe("client-id");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost/api/auth/callback/google");
    expect(location.searchParams.get("scope")).toBe("openid email profile");
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain("cpa_oauth_state=");
  });
});
