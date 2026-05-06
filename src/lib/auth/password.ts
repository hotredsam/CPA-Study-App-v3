import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const N = 16384;
const R = 8;
const P = 1;

function toBase64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export async function hashPassword(password: string, salt = randomBytes(16)): Promise<string> {
  const derived = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ["scrypt", "v1", String(N), String(R), String(P), toBase64Url(salt), toBase64Url(derived)].join("$");
}

export async function verifyPasswordHash(password: string, encodedHash: string | undefined): Promise<boolean> {
  if (!encodedHash) return false;
  const [algorithm, version, nRaw, rRaw, pRaw, saltRaw, hashRaw] = encodedHash.split("$");
  if (algorithm !== "scrypt" || version !== "v1" || !nRaw || !rRaw || !pRaw || !saltRaw || !hashRaw) {
    return false;
  }

  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  const derived = scryptSync(password, salt, expected.length, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
  });

  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
