import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  AUTH_COOKIE_NAME,
  DEFAULT_SESSION_TTL_SECONDS,
  getConfiguredLoginUsername,
  isAuthConfigured,
} from "@/lib/auth/session";
import { verifyPasswordHash } from "@/lib/auth/password";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LoginSchema = z
  .object({
    username: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().min(1).max(320).optional(),
    password: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (!data.username && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Username is required.",
        path: ["username"],
      });
    }
  });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!isAuthConfigured()) {
      throw new ApiError("INTERNAL_ERROR", "Login is not configured. Set AUTH_SECRET, APP_LOGIN_USERNAME, and APP_LOGIN_PASSWORD_HASH.");
    }

    const parsed = LoginSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Enter a valid username and password.", parsed.error.flatten());
    }

    const expectedUsername = getConfiguredLoginUsername();
    if (!expectedUsername) {
      throw new ApiError("INTERNAL_ERROR", "Login is not configured. Set AUTH_SECRET, APP_LOGIN_USERNAME, and APP_LOGIN_PASSWORD_HASH.");
    }

    const submittedUsername = (parsed.data.username ?? parsed.data.email ?? "").trim();
    const usernameMatches = submittedUsername.toLowerCase() === expectedUsername.trim().toLowerCase();
    const passwordMatches = await verifyPasswordHash(parsed.data.password, process.env["APP_LOGIN_PASSWORD_HASH"]);

    if (!usernameMatches || !passwordMatches) {
      throw new ApiError("BAD_REQUEST", "Username or password is incorrect.", undefined, 401);
    }

    const token = await createSessionToken({
      username: expectedUsername.trim(),
      secret: process.env["AUTH_SECRET"] ?? "",
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: DEFAULT_SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    return respond(err);
  }
}
