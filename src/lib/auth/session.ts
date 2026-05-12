export const AUTH_COOKIE_NAME = "cpa_session";
export const OAUTH_STATE_COOKIE_NAME = "cpa_oauth_state";
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const OAUTH_STATE_TTL_SECONDS = 60 * 10;

export type SessionPayload = {
  email: string;
  iat: number;
  exp: number;
};

export type OAuthStatePayload = {
  state: string;
  nextPath: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function signPayload(payload: object, secret: string): Promise<string> {
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(body, secret);
  return `${body}.${signature}`;
}

async function verifyPayload(token: string | undefined, secret: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = await hmacSha256(body, secret);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as unknown;
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function createSessionToken(args: {
  email: string;
  secret: string;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<string> {
  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  return signPayload(
    {
      email: args.email.trim().toLowerCase(),
      iat: nowSeconds,
      exp: nowSeconds + (args.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS),
    } satisfies SessionPayload,
    args.secret,
  );
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<SessionPayload | null> {
  const payload = await verifyPayload(token, secret);
  if (!payload) return null;

  const email = typeof payload["email"] === "string" ? payload["email"] : "";
  const iat = typeof payload["iat"] === "number" ? payload["iat"] : 0;
  const exp = typeof payload["exp"] === "number" ? payload["exp"] : 0;

  if (!email || !exp || exp * 1000 <= nowMs) return null;
  return { email, iat, exp };
}

export async function createOAuthStateToken(args: {
  state: string;
  nextPath: string;
  secret: string;
  ttlSeconds?: number;
  nowMs?: number;
}): Promise<string> {
  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  return signPayload(
    {
      state: args.state,
      nextPath: safeNextPath(args.nextPath),
      iat: nowSeconds,
      exp: nowSeconds + (args.ttlSeconds ?? OAUTH_STATE_TTL_SECONDS),
    } satisfies OAuthStatePayload,
    args.secret,
  );
}

export async function verifyOAuthStateToken(
  token: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<OAuthStatePayload | null> {
  const payload = await verifyPayload(token, secret);
  if (!payload) return null;

  const state = typeof payload["state"] === "string" ? payload["state"] : "";
  const nextPath = typeof payload["nextPath"] === "string" ? safeNextPath(payload["nextPath"]) : "/";
  const iat = typeof payload["iat"] === "number" ? payload["iat"] : 0;
  const exp = typeof payload["exp"] === "number" ? payload["exp"] : 0;

  if (!state || !exp || exp * 1000 <= nowMs) return null;
  return { state, nextPath, iat, exp };
}
