import { schedules, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { callOpenRouter } from "@/lib/llm/openrouter";

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
        where: { functionKey: functionKey as import("@prisma/client").AiFunctionKey },
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

          const llmResult = await callOpenRouter({
            model,
            messages: [
              { role: "user", content: JSON.stringify(job.payload) },
            ],
            maxTokens: 4096,
          });

          // Write ModelCall record
          const modelCallRow = await prisma.modelCall.create({
            data: {
              functionKey: job.functionKey,
              model: llmResult.model,
              inputTokens: llmResult.inputTokens,
              outputTokens: llmResult.outputTokens,
              usdCost: llmResult.usdCost,
              cacheHit: false,
              batchJobId: job.id,
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
