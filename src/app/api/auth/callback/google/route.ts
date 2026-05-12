import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedAuthEmail, isGoogleAuthConfigured } from "@/lib/auth/google";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientRateLimitKey, rateLimitResponse } from "@/lib/security/request";
import {
  AUTH_COOKIE_NAME,
  DEFAULT_SESSION_TTL_SECONDS,
  OAUTH_STATE_COOKIE_NAME,
  createSessionToken,
  safeNextPath,
  verifyOAuthStateToken,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TokenResponseSchema = z.object({
  id_token: z.string().min(1),
});

const TokenInfoSchema = z.object({
  aud: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.string()]),
});

function loginRedirect(request: NextRequest, error: "OAuth" | "AccessDenied" | "Configuration"): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function isVerified(value: boolean | string): boolean {
  return value === true || value === "true";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimit = checkRateLimit({
    key: clientRateLimitKey(request, "auth:callback:google"),
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  if (!isGoogleAuthConfigured()) {
    return loginRedirect(request, "Configuration");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = await verifyOAuthStateToken(
    request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value,
    process.env["AUTH_SECRET"],
  );

  if (!code || !state || !storedState || storedState.state !== state) {
    return loginRedirect(request, "OAuth");
  }

  const redirectUri = new URL("/api/auth/callback/google", request.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env["AUTH_GOOGLE_ID"] ?? "",
      client_secret: process.env["AUTH_GOOGLE_SECRET"] ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return loginRedirect(request, "OAuth");
  }

  const tokenBody = TokenResponseSchema.safeParse(await tokenResponse.json().catch(() => null));
  if (!tokenBody.success) {
    return loginRedirect(request, "OAuth");
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenBody.data.id_token)}`,
    { cache: "no-store" },
  );

  if (!tokenInfoResponse.ok) {
    return loginRedirect(request, "OAuth");
  }

  const tokenInfo = TokenInfoSchema.safeParse(await tokenInfoResponse.json().catch(() => null));
  if (
    !tokenInfo.success ||
    tokenInfo.data.aud !== process.env["AUTH_GOOGLE_ID"] ||
    !isVerified(tokenInfo.data.email_verified) ||
    !isAllowedAuthEmail(tokenInfo.data.email)
  ) {
    return loginRedirect(request, "AccessDenied");
  }

  const sessionToken = await createSessionToken({
    email: tokenInfo.data.email,
    secret: process.env["AUTH_SECRET"] ?? "",
  });
  const response = NextResponse.redirect(new URL(safeNextPath(storedState.nextPath), request.url));
  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
    path: "/",
  });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/auth/callback/google",
  });
  return response;
}
