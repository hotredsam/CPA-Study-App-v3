import { headers } from "next/headers";

export async function getServerBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configuredBaseUrl) return configuredBaseUrl;

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.VERCEL_URL ? "https" : "http");

  return `${protocol}://${host}`;
}
