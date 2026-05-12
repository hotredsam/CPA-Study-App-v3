import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, respond } from "./api-error";
import { z } from "zod";

describe("api-error", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("respond(ApiError) returns correct status + envelope for 400", async () => {
    const err = new ApiError("BAD_REQUEST", "bad input", { field: "required" });
    const res = respond(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("bad input");
    expect(body.error.details).toEqual({ field: "required" });
  });

  it("respond(ApiError) returns 404 for NOT_FOUND", async () => {
    const err = new ApiError("NOT_FOUND", "not found");
    const res = respond(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("respond(ApiError) returns 500 for INTERNAL_ERROR", async () => {
    const err = new ApiError("INTERNAL_ERROR", "oops");
    const res = respond(err);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("respond(Prisma init error) returns 503 without leaking invocation details", async () => {
    const err = Object.assign(
      new Error("Invalid `prisma.userSettings.upsert()` invocation: Can't reach database server at `localhost:5432`"),
      { name: "PrismaClientInitializationError" },
    );

    const res = respond(err);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(body.error.message).toContain("Database is unavailable");
    expect(body.error.message).not.toContain("prisma.userSettings.upsert");
  });

  it("respond(Prisma closed connection error) returns 503 without leaking invocation details", async () => {
    const err = Object.assign(
      new Error("Invalid `prisma.userSettings.findUnique()` invocation:\n\nServer has closed the connection."),
      { code: "P1017" },
    );

    const res = respond(err);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(body.error.message).toContain("Database is unavailable");
    expect(body.error.message).not.toContain("prisma.userSettings.findUnique");
  });

  it("respond(ZodError) returns 400 with flatten details", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (result.success) return;

    const res = respond(result.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.details).toBeDefined();
  });

  it("respond(unknown Error) returns 500 envelope", async () => {
    const res = respond(new Error("unexpected"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("redacts sensitive unknown error details outside production", async () => {
    const res = respond(
      new Error("OpenRouter failed with sk-or-secret-123 and postgresql://user:pass@host/db"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).not.toContain("sk-or-secret-123");
    expect(body.error.message).not.toContain("user:pass");
    expect(body.error.message).toContain("[REDACTED_OPENROUTER_KEY]");
    expect(body.error.message).toContain("[REDACTED_DATABASE_URL]");
  });
});
