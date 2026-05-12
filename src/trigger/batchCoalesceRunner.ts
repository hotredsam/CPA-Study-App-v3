import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createHash } from "node:crypto";
import { AiFunctionKey, CpaSection, Prisma } from "@prisma/client";
import { runAnkiGen } from "@/lib/ai/anki-gen";
import { TopicExtractOutput } from "@/lib/ai/topic-extract";
import { prisma } from "@/lib/prisma";
import { assertSpendAllowed, estimateFunctionUsd, type SpendContext } from "@/lib/budget/spend-gates";
import { callOpenRouter, type LLMMessage } from "@/lib/llm/openrouter";
import { extractJsonFromResponse } from "@/lib/claude-cli";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildMessages(payload: Prisma.JsonValue): LLMMessage[] {
  if (isRecord(payload) && typeof payload["prompt"] === "string") {
    const messages: LLMMessage[] = [];
    if (typeof payload["systemPrompt"] === "string") {
      messages.push({ role: "system", content: payload["systemPrompt"] });
    }
    messages.push({ role: "user", content: payload["prompt"] });
    return messages;
  }

  return [{ role: "user", content: JSON.stringify(payload) }];
}

function parseModelOutput(content: string): unknown {
  try {
    return extractJsonFromResponse(content);
  } catch {
    return content;
  }
}

function spendContextFromPayload(payload: Prisma.JsonValue): SpendContext {
  if (!isRecord(payload)) return {};
  return {
    recordingId: typeof payload["recordingId"] === "string" ? payload["recordingId"] : undefined,
    questionId: typeof payload["questionId"] === "string" ? payload["questionId"] : undefined,
    topicId: typeof payload["topicId"] === "string" ? payload["topicId"] : undefined,
    chunkId: typeof payload["chunkId"] === "string" ? payload["chunkId"] : undefined,
  };
}

function parseCpaSection(value: unknown): CpaSection | null {
  return typeof value === "string" && Object.values(CpaSection).includes(value as CpaSection)
    ? value as CpaSection
    : null;
}

function payloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function cacheBatchOutput(
  functionKey: string,
  payload: Prisma.JsonValue,
  output: unknown,
  enabled: boolean,
): Promise<void> {
  if (!enabled) return;

  const inputHash = sha256(JSON.stringify(payload));
  await prisma.cacheEntry.upsert({
    where: { functionKey_inputHash: { functionKey, inputHash } },
    create: {
      functionKey,
      inputHash,
      output: output as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      output: output as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hitCount: 0,
    },
  });
}

async function applyTopicExtractOutput(payload: Prisma.JsonValue, output: unknown): Promise<void> {
  if (!isRecord(payload) || typeof payload["chunkId"] !== "string") return;

  const parsed = TopicExtractOutput.safeParse(output);
  if (!parsed.success) return;
  const section = parseCpaSection(payload["section"]);
  const beckerUnit = payloadString(payload, "beckerUnit");

  const matchingTopic = await prisma.topic.findFirst({
    where: {
      name: { equals: parsed.data.canonicalTopic, mode: "insensitive" },
      ...(section ? { section } : {}),
      ...(beckerUnit ? { unit: beckerUnit } : {}),
    },
  });

  const topic = matchingTopic ?? (
    section
      ? await prisma.topic.create({
          data: {
            section,
            name: parsed.data.canonicalTopic,
            unit: beckerUnit ?? (parsed.data.subsection || null),
          },
        })
      : null
  );

  if (!topic) return;

  await prisma.chunk.update({
    where: { id: payload["chunkId"] },
    data: { topicId: topic.id },
  });

  if (!section) return;

  const existingCards = await prisma.ankiCard.count({ where: { chunkId: payload["chunkId"] } });
  if (existingCards > 0) return;

  const chunk = await prisma.chunk.findUnique({
    where: { id: payload["chunkId"] },
    select: {
      id: true,
      content: true,
      chapterRef: true,
    },
  });
  if (!chunk) return;

  try {
    await runAnkiGen({
      chunkId: chunk.id,
      content: chunk.content,
      topicId: topic.id,
      topicName: topic.name,
      chapterRef: chunk.chapterRef ?? undefined,
      section,
    });
  } catch (err) {
    logger.warn("batch-coalesce-runner: anki generation after topic extraction failed", {
      chunkId: chunk.id,
      topicId: topic.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Cron task that runs every 15 minutes to process coalesced batch jobs
 * whose coalesceWindowEnd has passed.
 */
export const batchCoalesceRunner = schedules.task({
  id: "batch-coalesce-runner",
  cron: "*/15 * * * *",
  maxDuration: 60 * 10, // 10 minutes max
  run: async () => {
    const now = new Date();

    // Find all queued jobs whose window has elapsed
    const readyJobs = await prisma.batchJob.findMany({
      where: {
        status: "QUEUED",
        coalesceWindowEnd: { lte: now },
      },
      orderBy: { createdAt: "asc" },
    });

    if (readyJobs.length === 0) {
      logger.log("batch-coalesce-runner: no jobs ready");
      return { processed: 0, failed: 0 };
    }

    // Group by functionKey
    const grouped = new Map<string, typeof readyJobs>();
    for (const job of readyJobs) {
      const arr = grouped.get(job.functionKey) ?? [];
      arr.push(job);
      grouped.set(job.functionKey, arr);
    }

    let processed = 0;
    let failed = 0;

    // Process each group — sequential iteration (Trigger.dev v3 constraint)
    for (const [functionKey, jobs] of grouped) {
      // Look up the model from ModelConfig
      const modelConfig = await prisma.modelConfig.findFirst({
        where: { functionKey: functionKey as AiFunctionKey },
      });

      const model = modelConfig?.model ?? "anthropic/claude-haiku-4.5";

      // Mark all as RUNNING
      const jobIds = jobs.map((j) => j.id);
      await prisma.batchJob.updateMany({
        where: { id: { in: jobIds } },
        data: { status: "RUNNING" },
      });

      // Process each job in the group sequentially
      for (const job of jobs) {
        try {
          // Note: offPeakPreferred header (X-OpenRouter-Prefer-Off-Peak: 1) is
          // logged here for observability; callOpenRouter does not yet accept
          // extraHeaders, so this is a no-op hint until that param is added.
          if (job.offPeakPreferred) {
            logger.log("batch-coalesce-runner: off-peak preferred for job", {
              jobId: job.id,
            });
          }

          const functionKeyEnum = job.functionKey as AiFunctionKey;
          const context = spendContextFromPayload(job.payload);
          const estimatedUsd = estimateFunctionUsd(functionKeyEnum);
          await assertSpendAllowed(functionKeyEnum, context, estimatedUsd);

          const llmResult = await callOpenRouter({
            model,
            messages: buildMessages(job.payload),
            maxTokens: 4096,
          });
          const parsedOutput = parseModelOutput(llmResult.content);

          // Write ModelCall record
          const modelCallRow = await prisma.modelCall.create({
            data: {
              functionKey: job.functionKey,
              model: llmResult.model,
              inputTokens: llmResult.inputTokens,
              outputTokens: llmResult.outputTokens,
              usdCost: llmResult.usdCost,
              estimatedUsd,
              cacheHit: false,
              batchJobId: job.id,
              recordingId: context.recordingId,
              questionId: context.questionId,
              topicId: context.topicId,
              chunkId: context.chunkId,
            },
          });

          await prisma.batchJob.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              resultId: modelCallRow.id,
            },
          });

          await cacheBatchOutput(
            job.functionKey,
            job.payload,
            parsedOutput,
            modelConfig?.cacheEnabled ?? false,
          );

          if (job.functionKey === AiFunctionKey.TOPIC_EXTRACT) {
            await applyTopicExtractOutput(job.payload, parsedOutput);
          }

          processed += 1;
        } catch (err) {
          logger.error("batch-coalesce-runner: job failed", {
            jobId: job.id,
            functionKey: job.functionKey,
            error: err instanceof Error ? err.message : String(err),
          });

          await prisma.batchJob.update({
            where: { id: job.id },
            data: { status: "FAILED" },
          });

          failed += 1;
        }
      }
    }

    logger.log("batch-coalesce-runner complete", { processed, failed });
    return { processed, failed };
  },
});
