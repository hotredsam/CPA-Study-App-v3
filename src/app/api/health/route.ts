import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasOpenRouterKeyConfigured } from "@/lib/llm/openrouter";

export const dynamic = "force-dynamic";

async function checkDb(): Promise<"ok" | "fail"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "fail";
  }
}

function checkR2(): "ok" | "unconfigured" {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  return required.every((k) => process.env[k]) ? "ok" : "unconfigured";
}

function checkTrigger(): "ok" | "unconfigured" {
  const id = process.env.TRIGGER_PROJECT_ID;
  if (!id || id.includes("placeholder")) return "unconfigured";
  return process.env.TRIGGER_SECRET_KEY ? "ok" : "unconfigured";
}

function checkEncryption(): "ok" | "unconfigured" {
  const key = process.env["ENCRYPTION_KEY"];
  if (!key) return "unconfigured";
  return /^[0-9a-fA-F]{64}$/.test(key) ? "ok" : "unconfigured";
}

async function checkOpenRouter(): Promise<"ok" | "unconfigured"> {
  try {
    return (await hasOpenRouterKeyConfigured()) ? "ok" : "unconfigured";
  } catch {
    return "unconfigured";
  }
}

export async function GET() {
  const [db, r2, trigger, openrouter, encryption] = await Promise.all([
    checkDb(),
    Promise.resolve(checkR2()),
    Promise.resolve(checkTrigger()),
    checkOpenRouter(),
    Promise.resolve(checkEncryption()),
  ]);

  const allOk = db === "ok" && r2 === "ok" && trigger === "ok" && openrouter === "ok";

  return NextResponse.json(
    { db, r2, trigger, openrouter, encryption, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
