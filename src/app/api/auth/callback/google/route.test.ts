import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OAUTH_STATE_COOKIE_NAME, createOAuthStateToken } from "@/lib/auth/session";
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

function setConfiguredEnv(): void {
  process.env["AUTH_SECRET"] = "test-secret";
  process.env["AUTH_GOOGLE_ID"] = "client-id";
  process.env["AUTH_GOOGLE_SECRET"] = "client-secret";
  process.env["AUTH_ALLOWED_EMAILS"] = "hotredsam@gmail.com";
}

async function requestWithState(email: string): Promise<NextRequest> {
  const token = await createOAuthStateToken({
    state: "state-123",
    nextPath: "/topics",
    secret: "test-secret",
    nowMs: Date.now(),
  });

  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({ id_token: "id-token" });
      }
      if (url.startsWith("https://oauth2.googleapis.com/tokeninfo")) {
        return Response.json({
          aud: "client-id",
          email,
          email_verified: "true",
        });
      }
      return new Response("unexpected auth fetch", { status: 500 });
    },
  );

  return new NextRequest("http://localhost/api/auth/callback/google?code=code-123&state=state-123", {
    headers: { cookie: `${OAUTH_STATE_COOKIE_NAME}=${token}` },
  });
}

describe("GET /api/auth/callback/google", () => {
  let savedEnv: Map<string, string | undefined>;

  beforeEach(() => {
    savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
    vi.restoreAllMocks();
    setConfiguredEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv(savedEnv);
  });

  it("rejects missing oauth state", async () => {
    const res = await GET(new NextRequest("http://localhost/api/auth/callback/google?code=code-123"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?error=OAuth");
  });

  it("rejects Google accounts outside the allowlist", async () => {
    const res = await GET(await requestWithState("other@example.com"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?error=AccessDenied");
    expect(res.headers.get("set-cookie") ?? "").not.toContain("cpa_session=");
  });

  it("sets a session cookie for the allowed Google account", async () => {
    const res = await GET(await requestWithState("hotredsam@gmail.com"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/topics");
    expect(res.headers.get("set-cookie")).toContain("cpa_session=");
  });
});
