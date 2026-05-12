import { AiFunctionKey } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export interface SpendContext {
  recordingId?: string;
  questionId?: string;
  topicId?: string;
  chunkId?: string;
}

export interface SpendGateSnapshot {
  enabled: boolean;
  estimatedUsd: number;
  dailySpentUsd: number;
  recordingSpentUsd: number | null;
  questionSpentUsd: number | null;
  dailyCapUsd: number;
  recordingCapUsd: number;
  questionCapUsd: number;
  perCallCapUsd: number;
}

const DEFAULT_PER_CALL_CAP_USD = 0.25;
const DEFAULT_DAILY_CAP_USD = 5;
const DEFAULT_RECORDING_CAP_USD = 2;
const DEFAULT_QUESTION_CAP_USD = 0.75;

const FUNCTION_ESTIMATES_USD: Record<AiFunctionKey, number> = {
  PIPELINE_GRADE: 0.06,
  PIPELINE_SEGMENT: 0.01,
  PIPELINE_TRANSCRIBE: 0,
  PIPELINE_EXTRACT: 0.08,
  PIPELINE_TAG: 0.015,
  TOPIC_EXTRACT: 0.04,
  CHECKPOINT_QUIZ: 0.025,
  ANKI_GEN: 0.03,
  CHAT_TUTOR: 0.02,
  VOICE_NOTE: 0.01,
  TOPIC_NOTES: 0.025,
};

function isAiFunctionKey(value: string): value is AiFunctionKey {
  return Object.values(AiFunctionKey).includes(value as AiFunctionKey);
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function gatesEnabled(): boolean {
  return process.env["SPEND_GATES_ENABLED"]?.toLowerCase() !== "false";
}

function todayStart(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function money(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

async function sumSpend(where: {
  createdAt: { gte: Date };
  recordingId?: string;
  questionId?: string;
}): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: number | null }>>`
    SELECT COALESCE(SUM(COALESCE(NULLIF("usdCost", 0), "estimatedUsd", 0)), 0)::float AS total
    FROM "ModelCall"
    WHERE "createdAt" >= ${where.createdAt.gte}
      AND (${where.recordingId ?? null}::text IS NULL OR "recordingId" = ${where.recordingId ?? null})
      AND (${where.questionId ?? null}::text IS NULL OR "questionId" = ${where.questionId ?? null})
  `;
  return money(rows[0]?.total);
}

export function estimateFunctionUsd(functionKey: AiFunctionKey | string, override?: number): number {
  if (override != null && Number.isFinite(override) && override >= 0) {
    return override;
  }
  return isAiFunctionKey(functionKey) ? FUNCTION_ESTIMATES_USD[functionKey] : 0.02;
}

export async function readSpendGateSnapshot(
  context: SpendContext,
  estimatedUsd: number,
): Promise<SpendGateSnapshot> {
  const dailyCapUsd = envNumber("OPENROUTER_DAILY_CAP_USD", DEFAULT_DAILY_CAP_USD);
  const recordingCapUsd = envNumber("OPENROUTER_RECORDING_CAP_USD", DEFAULT_RECORDING_CAP_USD);
  const questionCapUsd = envNumber("OPENROUTER_QUESTION_CAP_USD", DEFAULT_QUESTION_CAP_USD);
  const perCallCapUsd = envNumber("OPENROUTER_MAX_COST_PER_CALL_USD", DEFAULT_PER_CALL_CAP_USD);
  const since = todayStart();

  if (!gatesEnabled()) {
    return {
      enabled: false,
      estimatedUsd: roundMoney(estimatedUsd),
      dailySpentUsd: 0,
      recordingSpentUsd: null,
      questionSpentUsd: null,
      dailyCapUsd,
      recordingCapUsd,
      questionCapUsd,
      perCallCapUsd,
    };
  }

  const [dailySpentUsd, recordingSpentUsd, questionSpentUsd] = await Promise.all([
    sumSpend({ createdAt: { gte: since } }),
    context.recordingId
      ? sumSpend({ createdAt: { gte: since }, recordingId: context.recordingId })
      : Promise.resolve(null),
    context.questionId
      ? sumSpend({ createdAt: { gte: since }, questionId: context.questionId })
      : Promise.resolve(null),
  ]);

  return {
    enabled: true,
    estimatedUsd: roundMoney(estimatedUsd),
    dailySpentUsd: roundMoney(dailySpentUsd),
    recordingSpentUsd: recordingSpentUsd == null ? null : roundMoney(recordingSpentUsd),
    questionSpentUsd: questionSpentUsd == null ? null : roundMoney(questionSpentUsd),
    dailyCapUsd,
    recordingCapUsd,
    questionCapUsd,
    perCallCapUsd,
  };
}

export async function assertSpendAllowed(
  functionKey: AiFunctionKey | string,
  context: SpendContext,
  estimatedUsd: number,
): Promise<SpendGateSnapshot> {
  const snapshot = await readSpendGateSnapshot(context, estimatedUsd);
  if (!snapshot.enabled) return snapshot;

  const failures: string[] = [];
  if (snapshot.estimatedUsd > snapshot.perCallCapUsd) {
    failures.push(`estimated call cost ${snapshot.estimatedUsd} exceeds ${snapshot.perCallCapUsd}`);
  }
  if (snapshot.dailySpentUsd + snapshot.estimatedUsd > snapshot.dailyCapUsd) {
    failures.push(`daily cap ${snapshot.dailyCapUsd} would be exceeded`);
  }
  if (
    snapshot.recordingSpentUsd != null &&
    snapshot.recordingSpentUsd + snapshot.estimatedUsd > snapshot.recordingCapUsd
  ) {
    failures.push(`recording cap ${snapshot.recordingCapUsd} would be exceeded`);
  }
  if (
    snapshot.questionSpentUsd != null &&
    snapshot.questionSpentUsd + snapshot.estimatedUsd > snapshot.questionCapUsd
  ) {
    failures.push(`question cap ${snapshot.questionCapUsd} would be exceeded`);
  }

  if (failures.length > 0) {
    throw new ApiError("UNPROCESSABLE", "OpenRouter spend gate blocked this AI call.", {
      functionKey,
      failures,
      snapshot,
    });
  }

  return snapshot;
}
