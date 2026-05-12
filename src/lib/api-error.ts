import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "DATABASE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "CSRF_BLOCKED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "NOT_IMPLEMENTED"
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
    case "RATE_LIMITED": return 429;
    case "CSRF_BLOCKED": return 403;
    case "UNAUTHORIZED": return 401;
    case "NOT_FOUND": return 404;
    case "NOT_IMPLEMENTED": return 501;
    case "UNPROCESSABLE": return 422;
    case "METHOD_NOT_ALLOWED": return 405;
    case "INTERNAL_ERROR": return 500;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/sk-or-[A-Za-z0-9._-]+/g, "[REDACTED_OPENROUTER_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"'`<>]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Invalid `prisma\.[\s\S]*?(?:\n\n|$)/g, "Invalid Prisma invocation. ")
    .replace(/R2_SECRET_ACCESS_KEY\s*=\s*[^\s"'`<>]+/g, "R2_SECRET_ACCESS_KEY=[REDACTED]");
}

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (!isRecord(err)) return false;

  const name = typeof err["name"] === "string" ? err["name"] : "";
  const message = err instanceof Error ? err.message : "";
  const code = typeof err["code"] === "string" ? err["code"] : "";

  return (
    name === "PrismaClientInitializationError" ||
    code === "P1001" ||
    code === "P1017" ||
    message.includes("Can't reach database server") ||
    message.includes("Can't reach database") ||
    message.includes("Server has closed the connection")
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
      { status: err.status, headers: errorHeaders() },
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
      { status: 400, headers: errorHeaders() },
    );
  }

  if (isDatabaseUnavailableError(err)) {
    if (process.env["NODE_ENV"] === "production") {
      console.error("[api-error] database unavailable");
    } else {
      console.error("[api-error] database unavailable:", err);
    }
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: process.env["NODE_ENV"] === "production"
            ? "Database is temporarily unavailable. Please retry shortly."
            : "Database is unavailable. Start Docker Desktop and run `docker compose up -d postgres`, then retry.",
        },
      },
      { status: 503, headers: errorHeaders() },
    );
  }

  if (process.env["NODE_ENV"] === "production") {
    console.error("[api-error] unhandled error");
  } else {
    console.error("[api-error] unhandled:", err);
  }
  const message = process.env["NODE_ENV"] === "production"
    ? "An unexpected error occurred. Please retry shortly."
    : err instanceof Error
      ? redactSensitiveText(err.message)
      : "An unexpected error occurred";
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500, headers: errorHeaders() },
  );
}
