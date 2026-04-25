import { createHash } from "node:crypto";
import { AiFunctionKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { callClaude, extractJsonFromResponse } from "@/lib/claude-cli";
import { callOpenRouter, type LLMCallResult, type LLMMessage } from "./openrouter";

export interface RunFunctionOptions {
  bypassCache?: boolean;
  bypassBatch?: boolean;
}

export interface RunFunctionResult {
  output: unknown;
  cacheHit: boolean;
  batchJobId?: string;
  expectedCompletionAt?: Date;
}

/**
 * Thin adapter that wraps the existing claudeCli function to return LLMCallResult shape.
 */
async function claudeCliCall(payload: unknown): Promise<LLMCallResult> {
  // If payload carries a `prompt` field, send that as the actual prompt text.
  // Passing JSON.stringify(payload) would confuse Claude with wrapper metadata.
  const isObj = payload !== null && typeof payload === "object";
  const payloadRecord = isObj ? (payload as Record<string, unknown>) : null;
  const promptText =
    payloadRecord && typeof payloadRecord["prompt"] === "string"
      ? payloadRecord["prompt"]
      : JSON.stringify(payload);
  const systemPrompt =
    payloadRecord && typeof payloadRecord["systemPrompt"] === "string"
      ? payloadRecord["systemPrompt"]
      : undefined;
  const result = await callClaude(promptText, { systemPrompt });
  return {
    content: result,
    inputTokens: 0,
    outputTokens: 0,
    usdCost: 0,
    model: "oauth/claude",
  };
}

/**
 * Build messages for a function call.
 * Each AI feature will override this with its own prompt template (Phase E).
 * For now this is the stub.
 */
function buildMessages(
  _functionKey: AiFunctionKey,
  payload: unknown,
): LLMMessage[] {
  if (payload !== null && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record["prompt"] === "string") {
      const messages: LLMMessage[] = [];
      if (typeof record["systemPrompt"] === "string") {
        messages.push({ role: "system", content: record["systemPrompt"] });
      }
      messages.push({ role: "user", content: record["prompt"] });
      return messages;
    }
  }

  return [{ role: "user", content: JSON.stringify(payload) }];
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Central dispatcher for all AI function calls.
 * Routes to OpenRouter or claude-cli based on ModelConfig.useOAuthFallback.
 * Handles caching, batching, budget enforcement, and auto-degradation.
 */
export async function runFunction(
  functionKey: AiFunctionKey,
  payload: unknown,
  opts?: RunFunctionOptions,
): Promise<RunFunctionResult> {
  const bypassCache = opts?.bypassCache ?? false;
  const bypassBatch = opts?.bypassBatch ?? false;

  // Step 1: Load ModelConfig
  const modelConfig = await prisma.modelConfig.findUnique({
    where: { functionKey },
  });

  if (!modelConfig) {
    throw new Error(`ModelConfig not found for functionKey: ${functionKey}`);
  }

  // Step 2: Load Budget and check hard stop
  const budget = await prisma.budget.findFirst();

  if (budget) {
    if (budget.hardStop && budget.currentUsageUsd >= budget.monthlyCapUsd) {
      throw new Error("Budget hard stop: monthly cap reached");
    }
  }

  // Step 3: Check cache
  if (!bypassCache) {
    const inputHash = sha256(JSON.stringify(payload));
    const cached = await prisma.cacheEntry.findUnique({
      where: { functionKey_inputHash: { functionKey, inputHash } },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Increment hit count
      await prisma.cacheEntry.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } },
      });

      return { output: cached.output, cacheHit: true };
    }
  }

  // Step 4: Auto-degrade model if budget is near threshold
  let effectiveModel = modelConfig.model;

  if (budget?.autoDegrade) {
    const warnLevel = budget.warnThreshold * budget.monthlyCapUsd;
    if (budget.currentUsageUsd >= warnLevel) {
      if (
        (functionKey === AiFunctionKey.PIPELINE_GRADE ||
          functionKey === AiFunctionKey.CHECKPOINT_QUIZ) &&
        modelConfig.model.includes("sonnet")
      ) {
        effectiveModel = "anthropic/claude-haiku-4.5";
      }
    }
  }

  // Step 5: Check batch
  if (modelConfig.batchEnabled && !bypassBatch) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6h

    const job = await prisma.batchJob.create({
      data: {
        functionKey,
        payload: payload as Prisma.InputJsonValue,
        status: "QUEUED",
        coalesceWindowStart: now,
        coalesceWindowEnd: windowEnd,
      },
    });

    return {
      output: null,
      cacheHit: false,
      batchJobId: job.id,
      expectedCompletionAt: windowEnd,
    };
  }

  // Step 6: Dispatch
  let llmResult: LLMCallResult;

  if (modelConfig.useOAuthFallback) {
    llmResult = await claudeCliCall(payload);
  } else {
    const messages = buildMessages(functionKey, payload);
    llmResult = await callOpenRouter({
      model: effectiveModel,
      messages,
      maxTokens: 4096,
    });
  }

  // Parse output — try extractJsonFromResponse (handles prose wrapping), fall back to raw string
  let parsedOutput: unknown;
  try {
    parsedOutput = extractJsonFromResponse(llmResult.content);
  } catch {
    parsedOutput = llmResult.content;
  }

  // Step 7: Write ModelCall row
  await prisma.modelCall.create({
    data: {
      functionKey,
      model: llmResult.model,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      usdCost: llmResult.usdCost,
      cacheHit: false,
    },
  });

  // Step 8: Write cache entry if enabled (TTL 7 days)
  if (modelConfig.cacheEnabled) {
    const inputHash = sha256(JSON.stringify(payload));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.cacheEntry
      .upsert({
        where: { functionKey_inputHash: { functionKey, inputHash } },
        create: {
          functionKey,
          inputHash,
          output: parsedOutput as Prisma.InputJsonValue,
          expiresAt,
        },
        update: {
          output: parsedOutput as Prisma.InputJsonValue,
          expiresAt,
          hitCount: 0,
        },
      })
      .catch(() => {
        // Cache write failure is non-fatal
        logger.warn({ functionKey, inputHash }, "cache entry write failed");
      });
  }

  // Step 9: Increment budget usage (atomic)
  if (budget && llmResult.usdCost > 0) {
    await prisma.budget.update({
      where: { id: budget.id },
      data: { currentUsageUsd: { increment: llmResult.usdCost } },
    });
  }

  // Step 10: Emit pino log
  logger.info({
    functionKey,
    model: llmResult.model,
    inputTokens: llmResult.inputTokens,
    outputTokens: llmResult.outputTokens,
    usdCost: llmResult.usdCost,
    cacheHit: false,
  });

  // Step 11: Return result
  return { output: parsedOutput, cacheHit: false };
}
