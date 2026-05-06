import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "DATABASE_UNAVAILABLE"
  | "NOT_FOUND"
  | "UNPROCESSABLE"
  | "INTERNAL_ERROR"
  | "METHOD_NOT_ALLOWED";

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly status: number = codeToStatus(code),
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function codeToStatus(code: ErrorCode): number {
  switch (code) {
    case "BAD_REQUEST": return 400;
    case "DATABASE_UNAVAILABLE": return 503;
    case "NOT_FOUND": return 404;
    case "UNPROCESSABLE": return 422;
    case "METHOD_NOT_ALLOWED": return 405;
    case "INTERNAL_ERROR": return 500;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (!isRecord(err)) return false;

  const name = typeof err["name"] === "string" ? err["name"] : "";
  const message = err instanceof Error ? err.message : "";
  const code = typeof err["code"] === "string" ? err["code"] : "";

  return (
    name === "PrismaClientInitializationError" ||
    code === "P1001" ||
    message.includes("Can't reach database server") ||
    message.includes("Can't reach database")
  );
}

/**
 * Convert any thrown value to a typed error response envelope.
 * Envelope shape: {error: {code, message, details?}}
 */
export function respond(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid request",
          details: err.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (isDatabaseUnavailableError(err)) {
    console.error("[api-error] database unavailable:", err);
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message:
            "Database is unavailable. Start Docker Desktop and run `docker compose up -d postgres`, then retry.",
        },
      },
      { status: 503 },
    );
  }

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  console.error("[api-error] unhandled:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}
