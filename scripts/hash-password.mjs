#!/usr/bin/env node
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const password = process.argv[2];

if (!password) {
  console.error("Usage: pnpm auth:hash \"your long password\"");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(["scrypt", "v1", "16384", "8", "1", salt.toString("base64url"), Buffer.from(derived).toString("base64url")].join("$"));
