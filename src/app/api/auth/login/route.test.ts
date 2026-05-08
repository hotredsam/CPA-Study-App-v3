import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import { POST } from "./route";

const ORIGINAL_AUTH_ENV = {
  AUTH_SECRET: process.env["AUTH_SECRET"],
  APP_LOGIN_USERNAME: process.env["APP_LOGIN_USERNAME"],
  APP_LOGIN_EMAIL: process.env["APP_LOGIN_EMAIL"],
  APP_LOGIN_PASSWORD_HASH: process.env["APP_LOGIN_PASSWORD_HASH"],
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function restoreAuthEnv(): void {
  for (const [key, value] of Object.entries(ORIGINAL_AUTH_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    process.env["AUTH_SECRET"] = "test-secret";
    process.env["APP_LOGIN_USERNAME"] = "sam";
    delete process.env["APP_LOGIN_EMAIL"];
    process.env["APP_LOGIN_PASSWORD_HASH"] = await hashPassword("correct-password", Buffer.from("1234567890abcdef"));
  });

  afterEach(() => {
    restoreAuthEnv();
  });

  it("accepts username and password credentials", async () => {
    const response = await POST(makeRequest({ username: "sam", password: "correct-password" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cpa_session=");
  });

  it("rejects incorrect username credentials without raw implementation details", async () => {
    const response = await POST(makeRequest({ username: "wrong", password: "correct-password" }));
    const body = (await response.json()) as { error: { message: string } };

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Username or password is incorrect.");
  });

  it("keeps legacy email login bodies working while environments migrate", async () => {
    delete process.env["APP_LOGIN_USERNAME"];
    process.env["APP_LOGIN_EMAIL"] = "sam@example.com";

    const response = await POST(makeRequest({ email: "sam@example.com", password: "correct-password" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cpa_session=");
  });
});
