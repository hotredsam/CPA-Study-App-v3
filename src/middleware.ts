import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAuthConfigured,
  shouldRequireAuth,
  verifySessionToken,
} from "@/lib/auth/session";

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

  if (!isAuthConfigured()) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("setup", "missing");
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
    process.env["AUTH_SECRET"],
  );

  if (session) return NextResponse.next();

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
