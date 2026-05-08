export const AUTH_COOKIE_NAME = "cpa_session";
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  username: string;
  email?: string;
  iat: number;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getConfiguredLoginUsername(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const username = env["APP_LOGIN_USERNAME"]?.trim() || env["APP_LOGIN_EMAIL"]?.trim();
  return username || undefined;
}

export function isAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env["AUTH_SECRET"] && getConfiguredLoginUsername(env) && env["APP_LOGIN_PASSWORD_HASH"]);
}

export function shouldRequireAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env["AUTH_BYPASS"] === "true") return false;
  if (env["AUTH_REQUIRED"] === "true") return true;
  return env["VERCEL"] === "1" || env["NODE_ENV"] === "production";
}

export async function createSessionToken(args: {
  username: string;
  secret: string;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<string> {
  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  const payload: SessionPayload = {
    username: args.username,
    iat: nowSeconds,
    exp: nowSeconds + (args.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS),
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(body, args.secret);
  return `${body}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = await hmacSha256(body, secret);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as unknown;
    if (!isRecord(payload)) return null;

    const username =
      typeof payload["username"] === "string"
        ? payload["username"]
        : typeof payload["email"] === "string"
          ? payload["email"]
          : "";
    const email = typeof payload["email"] === "string" ? payload["email"] : undefined;
    const iat = typeof payload["iat"] === "number" ? payload["iat"] : 0;
    const exp = typeof payload["exp"] === "number" ? payload["exp"] : 0;

    if (!username || !exp || exp * 1000 <= nowMs) return null;
    return { username, email, iat, exp };
  } catch {
    return null;
  }
}
