#!/usr/bin/env node
/**
 * Headless pipeline runner for fixture acceptance testing.
 *
 * Prerequisites:
 *   - pnpm dev (port 3001) running in another terminal
 *   - pnpm trigger:dev running in another terminal
 *   - .env with real DATABASE_URL, R2_*, TRIGGER_*
 *
 * Usage:
 *   node scripts/run-pipeline-on-fixture.mjs fixtures/sample-3q.mp4 [--base-url http://localhost:3001]
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE_URL = (() => {
  const idx = process.argv.indexOf("--base-url");
  return idx !== -1 ? process.argv[idx + 1] : "http://localhost:3001";
})();

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error("Usage: node scripts/run-pipeline-on-fixture.mjs <fixture-path>");
  process.exit(1);
}

const fixtureName = basename(fixturePath, extname(fixturePath));
const reportsDir = join(process.cwd(), "reports");
mkdirSync(reportsDir, { recursive: true });

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 15 * 60 * 1_000; // 15 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function uploadToR2(url, filePath, contentType) {
  const data = readFileSync(filePath);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: data,
  });
  return { status: res.status, ok: res.ok };
}

function detectContentType(path) {
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".mkv")) return "video/x-matroska";
  if (path.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
}

async function pollUntilDone(recordingId, db, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: {
        questions: {
          include: { feedback: true },
        },
        progress: { orderBy: { updatedAt: "desc" }, take: 20 },
      },
    });

    last = recording;
    const status = recording?.status;
    const doneStatuses = ["done", "failed", "complete", "partial"];
    const allQsDone =
      recording?.questions?.length > 0 &&
      recording.questions.every((q) => ["done", "failed", "incomplete"].includes(q.status));

    console.log(
      `  [${new Date().toISOString()}] status=${status} questions=${recording?.questions?.length ?? 0} done=${allQsDone}`
    );

    if (doneStatuses.includes(status) || allQsDone) {
      return { recording: last, timedOut: false };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return { recording: last, timedOut: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const timings = {};
  const t0 = Date.now();

  console.log(`\n=== Pipeline fixture runner ===`);
  console.log(`Fixture: ${fixturePath}`);
  console.log(`Base URL: ${BASE_URL}`);

  // ── Step 1: Create recording ──────────────────────────────────────────────
  console.log("\n[1/4] Creating recording row + presigned upload URL…");
  const t1 = Date.now();
  const contentType = detectContentType(fixturePath);
  const createRes = await apiPost("/api/recordings", { contentType });

  if (!createRes.ok) {
    console.error("FAIL: POST /api/recordings returned", createRes.status, createRes.json);
    process.exit(1);
  }

  const { recordingId, uploadUrl } = createRes.json;
  timings.create = Date.now() - t1;
  console.log(`  recordingId=${recordingId}`);
  console.log(`  uploadUrl=${uploadUrl.slice(0, 80)}…`);

  // ── Step 2: Upload to R2 ──────────────────────────────────────────────────
  console.log("\n[2/4] Uploading fixture to R2…");
  const t2 = Date.now();
  const uploadRes = await uploadToR2(uploadUrl, fixturePath, contentType);
  timings.upload = Date.now() - t2;

  if (!uploadRes.ok) {
    console.error("FAIL: R2 PUT returned", uploadRes.status);
    process.exit(1);
  }
  console.log(`  R2 upload OK (${timings.upload}ms)`);

  // ── Step 3: Trigger pipeline ──────────────────────────────────────────────
  console.log("\n[3/4] Triggering pipeline…");
  const t3 = Date.now();
  const completeRes = await apiPost(`/api/recordings/${recordingId}/complete`, {});
  timings.trigger = Date.now() - t3;

  if (!completeRes.ok) {
    console.error("FAIL: POST complete returned", completeRes.status, completeRes.json);
    if (fixtureName.includes("corrupt")) {
      console.log("  NOTE: corrupt fixture expected to fail — asserting graceful failure");
      // Corrupt fixture should fail gracefully, not 500
      if (completeRes.status >= 500) {
        console.error("FATAL: corrupt fixture caused server 500 — not graceful");
        process.exit(1);
      }
      console.log("  Graceful failure confirmed (non-5xx).");
      return writeReport(fixtureName, {
        recordingId,
        status: "graceful-failure",
        timings,
        questions: [],
        feedbacks: [],
        progress: [],
        timedOut: false,
        totalMs: Date.now() - t0,
      });
    }
    process.exit(1);
  }

  const { runId } = completeRes.json;
  console.log(`  runId=${runId}`);

  // ── Step 4: Poll until done ───────────────────────────────────────────────
  console.log(`\n[4/4] Polling DB for completion (max ${TIMEOUT_MS / 60000}min)…`);

  // Lazy-load Prisma to avoid env validation at script load time
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  try {
    const { recording, timedOut } = await pollUntilDone(recordingId, db, TIMEOUT_MS);
    timings.pipeline = Date.now() - t3;

    const questions = recording?.questions ?? [];
    const feedbacks = questions.map((q) => q.feedback).filter(Boolean);
    const progress = recording?.progress ?? [];

    console.log(`\n  timedOut=${timedOut}`);
    console.log(`  questions=${questions.length}`);
    console.log(`  feedbacks=${feedbacks.length}`);

    writeReport(fixtureName, {
      recordingId,
      status: timedOut ? "timed-out" : recording?.status ?? "unknown",
      timings: { ...timings, totalMs: Date.now() - t0 },
      questions: questions.map((q) => ({
        id: q.id,
        status: q.status,
        startSec: q.startSec,
        endSec: q.endSec,
        section: q.section,
        hasTranscript: !!q.transcript,
        hasExtracted: !!q.extracted,
        hasFeedback: !!q.feedback,
      })),
      feedbacks: feedbacks.map((f) => ({
        questionId: f.questionId,
        combinedScore: f.combinedScore,
        accountingScore: f.accountingScore,
        consultingScore: f.consultingScore,
        itemCount: Array.isArray(f.items) ? f.items.length : 0,
        weakTopicTags: f.weakTopicTags,
      })),
      progress: progress.map((p) => ({
        stage: p.stage,
        pct: p.pct,
        message: p.message,
        updatedAt: p.updatedAt,
      })),
      timedOut,
      totalMs: Date.now() - t0,
    });
  } finally {
    await db.$disconnect();
  }
}

function writeReport(fixtureName, data) {
  const outputPath = join("reports", `night3-fixture-${fixtureName}-output.json`);
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\n  Output written: ${outputPath}`);

  const timingPath = join("reports", `night3-fixture-${fixtureName}-timing.md`);
  const lines = [
    `# Fixture run timing — ${fixtureName}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Stage | Duration |",
    "| ----- | -------- |",
    `| Create recording row | ${data.timings.create ?? "—"}ms |`,
    `| R2 upload | ${data.timings.upload ?? "—"}ms |`,
    `| Pipeline trigger | ${data.timings.trigger ?? "—"}ms |`,
    `| Full pipeline (wall-clock) | ${data.timings.pipeline ? (data.timings.pipeline / 1000).toFixed(1) + "s" : "—"} |`,
    `| Total script time | ${((data.timings.totalMs ?? 0) / 1000).toFixed(1)}s |`,
    "",
    `Status: ${data.status}`,
    `Questions produced: ${data.questions.length}`,
    `Feedbacks produced: ${data.feedbacks.length}`,
    `Timed out: ${data.timedOut}`,
  ];
  writeFileSync(timingPath, lines.join("\n"));
  console.log(`  Timing written: ${timingPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
