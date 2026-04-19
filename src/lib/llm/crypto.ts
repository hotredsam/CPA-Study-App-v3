import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env["ENCRYPTION_KEY"];
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Provide a 64-character hex string (32 bytes) for AES-256-GCM encryption.",
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${keyHex.length} characters.`,
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-separated hex string: "iv:authTag:ciphertext"
 */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a string produced by encryptKey.
 * Expects format "iv:authTag:ciphertext" (hex).
 * Throws if format is invalid, ENCRYPTION_KEY is missing, or decryption fails.
 */
export function decryptKey(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error(
      `decryptKey: invalid format. Expected "iv:authTag:ciphertext", got ${parts.length} parts.`,
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (iv.length !== IV_BYTES) {
    throw new Error(`decryptKey: invalid IV length. Expected ${IV_BYTES} bytes.`);
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(
      `decryptKey: invalid auth tag length. Expected ${AUTH_TAG_BYTES} bytes.`,
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
