import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, AUTH_COOKIE_NAME, DEFAULT_SESSION_TTL_SECONDS, isAuthConfigured } from "@/lib/auth/session";
import { verifyPasswordHash } from "@/lib/auth/password";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!isAuthConfigured()) {
      throw new ApiError("INTERNAL_ERROR", "Login is not configured. Set AUTH_SECRET, APP_LOGIN_EMAIL, and APP_LOGIN_PASSWORD_HASH.");
    }

    const parsed = LoginSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Enter a valid email and password.", parsed.error.flatten());
    }

    const expectedEmail = process.env["APP_LOGIN_EMAIL"];
    const emailMatches = parsed.data.email.trim().toLowerCase() === expectedEmail?.trim().toLowerCase();
    const passwordMatches = await verifyPasswordHash(parsed.data.password, process.env["APP_LOGIN_PASSWORD_HASH"]);

    if (!emailMatches || !passwordMatches) {
      throw new ApiError("BAD_REQUEST", "Email or password is incorrect.", undefined, 401);
    }

    const token = await createSessionToken({
      email: parsed.data.email.trim().toLowerCase(),
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
