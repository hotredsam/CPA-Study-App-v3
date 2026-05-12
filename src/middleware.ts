import { NextRequest, NextResponse } from "next/server";
import { isAllowedAuthEmail, isGoogleAuthConfigured, shouldRequireAuth } from "@/lib/auth/google";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  clientRateLimitKey,
  hasTrustedSameOrigin,
  isStateChangingMethod,
  rateLimitResponse,
} from "@/lib/security/request";

const PUBLIC_PATH_PREFIXES = [
  "/_next",
  "/api/auth",
  "/api/health",
  "/icon.svg",
  "/favicon.ico",
  "/login",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  return /\.[a-z0-9]+$/i.test(pathname);
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  const scriptSrc = process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https: wss:",
      "font-src 'self' data: https://fonts.gstatic.com",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "worker-src 'self' blob:",
    ].join("; "),
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || isStaticAsset(pathname) || !shouldRequireAuth()) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isGoogleAuthConfigured()) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json(
        { error: { code: "AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured." } },
        { status: 503 },
      ));
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("setup", "missing");
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const session = await verifySessionToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
    process.env["AUTH_SECRET"],
  );

  if (isAllowedAuthEmail(session?.email)) {
    if (pathname.startsWith("/api/") && isStateChangingMethod(request.method)) {
      const rateLimit = checkRateLimit({
        key: clientRateLimitKey(request, `api:${pathname}`),
        limit: 60,
        windowMs: 60_000,
      });
      if (!rateLimit.allowed) return withSecurityHeaders(rateLimitResponse(rateLimit));

      if (!hasTrustedSameOrigin(request)) {
        return withSecurityHeaders(NextResponse.json(
          { error: { code: "CSRF_BLOCKED", message: "Cross-site request blocked." } },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        ));
      }
    }

    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return withSecurityHeaders(NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required." } },
      { status: 401 },
    ));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return withSecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
