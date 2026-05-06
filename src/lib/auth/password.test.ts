import { describe, expect, it } from "vitest";
import { hashPassword, verifyPasswordHash } from "./password";

describe("password hashes", () => {
  it("verifies generated scrypt hashes", async () => {
    const encoded = await hashPassword("correct horse battery staple", Buffer.from("1234567890123456"));

    await expect(verifyPasswordHash("correct horse battery staple", encoded)).resolves.toBe(true);
    await expect(verifyPasswordHash("wrong", encoded)).resolves.toBe(false);
  });

  it("fails closed on malformed hashes", async () => {
    await expect(verifyPasswordHash("password", undefined)).resolves.toBe(false);
    await expect(verifyPasswordHash("password", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPasswordHash("password", "scrypt$v1$nan$8$1$salt$hash")).resolves.toBe(false);
    await expect(verifyPasswordHash("password", "scrypt$v1$16384$8$1$$hash")).resolves.toBe(false);
  });
});
