import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
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
    case "NOT_FOUND": return 404;
    case "UNPROCESSABLE": return 422;
    case "METHOD_NOT_ALLOWED": return 405;
    case "INTERNAL_ERROR": return 500;
  }
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

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  console.error("[api-error] unhandled:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}
