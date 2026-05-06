import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const distDir = process.env.NEXT_DIST_DIR?.trim();
const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
const r2PublicOrigin = (() => {
  if (!r2PublicUrl) return undefined;
  try {
    return new URL(r2PublicUrl).origin;
  } catch {
    return undefined;
  }
})();

const r2Origins = [
  "https://*.r2.cloudflarestorage.com",
  ...(r2PublicOrigin ? [r2PublicOrigin] : []),
];

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  // HSTS — production only; dev skips so localhost HTTP works
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  {
    key: "Content-Security-Policy",
    value: isDev
      ? // Permissive in dev to allow HMR websockets + Next.js overlay
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
      : [
          "default-src 'self'",
          // Allow Trigger.dev realtime websocket
          `connect-src 'self' https://*.trigger.dev wss://*.trigger.dev ${r2Origins.join(" ")}`,
          // Allow Cloudflare R2 for video/clip URLs
          `media-src 'self' blob: ${r2Origins.join(" ")}`,
          `img-src 'self' data: blob: ${r2Origins.join(" ")}`,
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "frame-ancestors 'none'",
        ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  devIndicators: false,
  ...(distDir ? { distDir } : {}),

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
