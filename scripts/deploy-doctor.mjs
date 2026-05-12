#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const explicitBaseUrl = process.argv.find((arg) => arg.startsWith("--base-url="))?.split("=").slice(1).join("=");
const productionMode =
  args.has("--production") ||
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production";
const smokeBaseUrl =
  explicitBaseUrl ||
  process.env.DEPLOY_DOCTOR_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "";

function loadEnvFile(filename) {
  const file = path.join(ROOT, filename);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const results = [];

function check(name, ok, detail, severity = "error") {
  results.push({ name, ok, detail, severity });
}

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function validateUrl(name, { requireRemote = false } = {}) {
  const value = process.env[name];
  if (!value) {
    check(name, false, "Missing", "error");
    return;
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    check(name, !requireRemote || !local, requireRemote && local ? "Must not point at localhost in production" : "Configured");
  } catch {
    check(name, false, "Invalid URL", "error");
  }
}

function required(name, severity = "error") {
  check(name, present(name), present(name) ? "Configured" : "Missing", severity);
}

function warning(name, ok, detail) {
  check(name, ok, detail, "warning");
}

validateUrl("DATABASE_URL", { requireRemote: productionMode });
for (const name of [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "TRIGGER_PROJECT_ID",
  "TRIGGER_SECRET_KEY",
  "OPENROUTER_API_KEY",
  "ENCRYPTION_KEY",
]) {
  required(name);
}

for (const name of [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_ALLOWED_EMAILS",
]) {
  required(name, productionMode ? "error" : "warning");
}

check(
  "AUTH_REQUIRED",
  process.env.AUTH_REQUIRED === "true",
  process.env.AUTH_REQUIRED === "true" ? "Enabled" : "Set AUTH_REQUIRED=true before production deploy",
  productionMode ? "error" : "warning",
);
check(
  "AUTH_ALLOWED_EMAILS",
  (process.env.AUTH_ALLOWED_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).includes("hotredsam@gmail.com"),
  "Must include hotredsam@gmail.com",
  productionMode ? "error" : "warning",
);
check(
  "AUTH_SECRET length",
  (process.env.AUTH_SECRET ?? "").length >= 32,
  "Use at least 32 random characters",
  productionMode ? "error" : "warning",
);
check(
  "ENCRYPTION_KEY format",
  /^[a-f0-9]{64}$/i.test(process.env.ENCRYPTION_KEY ?? ""),
  "Must be 64 hex characters for AES-256-GCM",
);
check(
  "AUTH_BYPASS",
  !productionMode || process.env.AUTH_BYPASS !== "true",
  "AUTH_BYPASS must not be true in production",
  productionMode ? "error" : "warning",
);
check(
  "ALLOW_LOCAL_PROD_AUTH_BYPASS",
  !productionMode || process.env.ALLOW_LOCAL_PROD_AUTH_BYPASS !== "true",
  "Local production-smoke auth bypass must not be enabled in production",
  productionMode ? "error" : "warning",
);
check(
  "TEXTBOOK_INDEXER_MODE",
  !productionMode || process.env.TEXTBOOK_INDEXER_MODE !== "local",
  "Production indexing must run through Trigger.dev, not local mode",
  productionMode ? "error" : "warning",
);
check(
  "ADMIN_WIPE",
  !productionMode || process.env.ENABLE_ADMIN_WIPE !== "true",
  "ENABLE_ADMIN_WIPE must not be true in production",
  productionMode ? "error" : "warning",
);
warning(
  "NEXT_PUBLIC secret hygiene",
  !Object.keys(process.env).some((key) => key.startsWith("NEXT_PUBLIC_") && /KEY|SECRET|TOKEN|PASSWORD/i.test(key)),
  "Do not expose secrets through NEXT_PUBLIC_* variables",
);

const caps = [
  ["OPENROUTER_MAX_COST_PER_CALL_USD", 0.15],
  ["OPENROUTER_DAILY_CAP_USD", 3],
  ["OPENROUTER_RECORDING_CAP_USD", 1.25],
  ["OPENROUTER_QUESTION_CAP_USD", 0.25],
  ["TRIGGER_ACTIVE_RECORDING_LIMIT", 1],
];
for (const [name, fallback] of caps) {
  const value = envNumber(name, fallback);
  warning(name, value > 0, `${name}=${value}`);
}

async function smokeTest(baseUrl) {
  if (!baseUrl) return;
  const normalized = baseUrl.replace(/\/$/, "");
  for (const endpoint of ["/login", "/api/health"]) {
    const target = `${normalized}${endpoint}`;
    try {
      const response = await fetch(target, { redirect: "manual" });
      const text = await response.text();
      const bodyLooksSafe =
        !/Invalid `prisma\.|Can't reach database server|OPENROUTER_API_KEY|R2_SECRET_ACCESS_KEY|DATABASE_URL/i.test(text);
      const hasNosniff = response.headers.get("x-content-type-options") === "nosniff";
      check(
        `smoke ${endpoint}`,
        response.status < 500 && bodyLooksSafe && hasNosniff,
        `HTTP ${response.status}; security headers ${hasNosniff ? "ok" : "missing"}`,
      );
    } catch (error) {
      check(`smoke ${endpoint}`, false, error instanceof Error ? error.message : "Fetch failed");
    }
  }
}

async function databaseProductionChecks() {
  if (!productionMode || !present("DATABASE_URL")) return;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const oauthFallbackCount = await prisma.modelConfig.count({
      where: { useOAuthFallback: true },
    });
    await prisma.$disconnect();
    check(
      "ModelConfig OAuth fallback",
      oauthFallbackCount === 0,
      oauthFallbackCount === 0
        ? "No local OAuth fallback configs persisted"
        : `${oauthFallbackCount} config(s) still enable local OAuth fallback`,
      "error",
    );
  } catch (error) {
    check(
      "ModelConfig OAuth fallback",
      false,
      `Could not verify persisted model configs: ${error instanceof Error ? error.message : "unknown error"}`,
      "error",
    );
  }
}

await smokeTest(smokeBaseUrl);
await databaseProductionChecks();

const failures = results.filter((result) => !result.ok && result.severity === "error");
const warnings = results.filter((result) => !result.ok && result.severity === "warning");

for (const result of results) {
  const icon = result.ok ? "PASS" : result.severity === "warning" ? "WARN" : "FAIL";
  console.log(`${icon} ${result.name}: ${result.detail}`);
}

console.log("");
console.log(JSON.stringify({
  productionMode,
  smokeBaseUrl: smokeBaseUrl || null,
  passed: failures.length === 0,
  failures: failures.length,
  warnings: warnings.length,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
