import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { createOAuthStateToken, OAUTH_STATE_COOKIE_NAME, OAUTH_STATE_TTL_SECONDS, safeNextPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectToLogin(request: NextRequest, setupMissing = false): NextResponse {
  const loginUrl = new URL("/login", request.url);
  if (setupMissing) loginUrl.searchParams.set("setup", "missing");
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isGoogleAuthConfigured()) {
    return redirectToLogin(request, true);
  }

  const state = randomBytes(32).toString("base64url");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUri = new URL("/api/auth/callback/google", request.url).toString();
  const stateToken = await createOAuthStateToken({
    state,
    nextPath,
    secret: process.env["AUTH_SECRET"] ?? "",
  });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", process.env["AUTH_GOOGLE_ID"] ?? "");
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, stateToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: "/api/auth/callback/google",
  });
  return response;
}
