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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || isStaticAsset(pathname) || !shouldRequireAuth()) {
    return NextResponse.next();
  }

  if (!isGoogleAuthConfigured()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured." } },
        { status: 503 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("setup", "missing");
    return NextResponse.redirect(loginUrl);
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
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

      if (!hasTrustedSameOrigin(request)) {
        return NextResponse.json(
          { error: { code: "CSRF_BLOCKED", message: "Cross-site request blocked." } },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required." } },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
