import { describe, expect, it } from "vitest";
import { ApiError, respond } from "./api-error";
import { ZodError, z } from "zod";

describe("api-error", () => {
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
});
