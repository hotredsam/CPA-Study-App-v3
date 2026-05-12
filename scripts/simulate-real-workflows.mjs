#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.WORKFLOW_SIM_BASE_URL ?? "http://localhost:3002";
const prisma = new PrismaClient();
const runId = `workflow-${Date.now()}-${randomUUID().slice(0, 8)}`;

const crashPatterns = [
  /Runtime Error/i,
  /Unhandled Runtime Error/i,
  /Application error/i,
  /Internal Server Error/i,
  /Cannot find module/i,
  /ENOENT/i,
  /_document\.js/i,
  /Invalid `prisma\./i,
  /PrismaClientInitializationError/i,
  /This page could not be found/i,
];

const providerPatterns = [
  /openrouter\.ai/i,
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /trigger\.dev/i,
  /r2\.cloudflarestorage\.com/i,
];

function absolute(path) {
  return new URL(path, baseUrl).toString();
}

function iso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function feedbackItems() {
  return {
    items: [
      { key: "technical_accuracy", score: 8, body: "The answer applies the core FAR rule correctly." },
      { key: "evidence", score: 8, body: "The reasoning names the relevant treatment before choosing." },
      { key: "clarity", score: 7, body: "The verbal explanation is clear enough to review later." },
      { key: "pitfall", score: 7, body: "Watch for confusing recognition with measurement." },
    ],
  };
}

function extractedQuestion(index) {
  return {
    question: `Workflow simulation question ${index}: which treatment is appropriate?`,
    choices: [
      { label: "A", text: "Recognize immediately." },
      { label: "B", text: "Defer until earned." },
      { label: "C", text: "Disclose only." },
      { label: "D", text: "Ignore as immaterial." },
    ],
    userAnswer: index === 1 ? "B" : "A",
    correctAnswer: "B",
    correctIndex: 1,
    beckerExplanation: "Revenue recognition depends on satisfying the performance obligation.",
    section: "FAR",
  };
}

function transcript(index) {
  return {
    segments: [
      {
        start: 0,
        end: 12,
        text: `For question ${index}, I would identify the obligation first and then match recognition to completion.`,
        words: [
          { start: 0, end: 0.4, word: "For" },
          { start: 0.5, end: 0.9, word: "question" },
          { start: 1, end: 1.3, word: String(index) },
        ],
      },
    ],
  };
}

async function cleanupTempData(ids) {
  await prisma.recording.deleteMany({ where: { id: { in: ids.filter(Boolean) } } });
  await prisma.recording.deleteMany({ where: { title: { startsWith: "Workflow Simulation" } } });
}

async function createTempData() {
  const doneId = `${runId}-done`;
  const processingId = `${runId}-processing`;
  const browserUploadId = `${runId}-browser-upload`;
  const iphoneUploadId = `${runId}-iphone-upload`;
  const topic = await prisma.topic.findFirst({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  await cleanupTempData([doneId, processingId, browserUploadId, iphoneUploadId]);

  await prisma.recording.create({
    data: {
      id: doneId,
      title: "Workflow Simulation Completed Session",
      status: "done",
      r2Key: `workflow/${runId}/done.webm`,
      durationSec: 420,
      sections: ["FAR"],
      segmentsCount: 2,
      modelUsed: "simulation/no-api-call",
      questions: {
        create: [1, 2].map((index) => ({
          startSec: (index - 1) * 90,
          endSec: index * 90,
          section: "FAR",
          status: "done",
          noAudio: false,
          topicId: topic?.id ?? null,
          extracted: extractedQuestion(index),
          transcript: transcript(index),
          tags: { section: "FAR", unit: "F1", topic: topic?.name ?? "Workflow Topic" },
          feedback: {
            create: {
              accountingScore: index === 1 ? 8.5 : 6.5,
              consultingScore: index === 1 ? 8 : 7,
              combinedScore: index === 1 ? 8.3 : 6.7,
              items: feedbackItems(),
              whatYouNeedToLearn: "Keep tying the rule to the performance obligation before selecting an answer.",
              weakTopicTags: [topic?.name ?? "Workflow Topic"],
            },
          },
        })),
      },
    },
  });

  await prisma.recording.create({
    data: {
      id: processingId,
      title: "Workflow Simulation Processing Session",
      status: "processing_questions",
      r2Key: `workflow/${runId}/processing.webm`,
      durationSec: 300,
      sections: ["FAR"],
      segmentsCount: 3,
      modelUsed: "simulation/no-api-call",
      progress: {
        create: [
          { stage: "uploading", pct: 100, etaSec: null, message: "Upload complete", updatedAt: new Date(Date.now() - 240_000) },
          { stage: "segmenting", pct: 100, etaSec: null, message: "3 candidate questions found", updatedAt: new Date(Date.now() - 180_000) },
          { stage: "extracting", pct: 67, etaSec: 24, message: "Extracting question 2 of 3", updatedAt: new Date(Date.now() - 30_000) },
        ],
      },
      questions: {
        create: [
          { startSec: 0, endSec: 80, section: "FAR", status: "done", noAudio: false, extracted: extractedQuestion(1), transcript: transcript(1) },
          { startSec: 80, endSec: 170, section: "FAR", status: "extracting", noAudio: false },
          { startSec: 170, endSec: 260, section: "FAR", status: "pending", noAudio: false },
        ],
      },
    },
  });

  await prisma.recording.create({
    data: {
      id: browserUploadId,
      title: "Workflow Simulation Browser Upload",
      status: "uploaded",
      r2Key: `workflow/${runId}/browser-upload.webm`,
      durationSec: 15,
      sections: ["FAR"],
    },
  });

  await prisma.recording.create({
    data: {
      id: iphoneUploadId,
      title: "Workflow Simulation iPhone Upload",
      status: "uploaded",
      r2Key: `workflow/${runId}/iphone-upload.mp4`,
      durationSec: 20,
      sections: ["FAR"],
    },
  });

  return { doneId, processingId, browserUploadId, iphoneUploadId };
}

async function attachGuards(page, label, mobile = false) {
  const state = { issues: [], providerRequests: [] };

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      state.issues.push(`${label} console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => state.issues.push(`${label} pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) state.issues.push(`${label} ${response.status()} ${response.url()}`);
  });
  page.on("request", (request) => {
    if (providerPatterns.some((pattern) => pattern.test(request.url()))) {
      state.providerRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => undefined);
  });

  state.assertHealthy = async (checkpoint) => {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(250);
    const body = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
    const matched = crashPatterns.find((pattern) => pattern.test(body));
    if (matched) throw new Error(`${checkpoint} showed crash text ${matched}: ${body.slice(0, 500)}`);
    if (state.issues.length > 0) throw new Error(`${checkpoint} issues:\n${state.issues.join("\n")}`);
    if (mobile) {
      const overflow = await page.evaluate(() => {
        const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        return width - window.innerWidth;
      });
      if (overflow > 2) throw new Error(`${checkpoint} caused ${overflow}px mobile horizontal overflow`);
    }
  };

  return state;
}

async function installNoSpendRoutes(page, temp) {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ db: "ok", r2: "ok", trigger: "ok", openrouter: "ok", encryption: "ok" }),
    });
  });

  await page.route("**/api/settings/openrouter-key", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasKey: true, suffix: "sim" }),
    });
  });

  await page.route("**/api/settings/exam-sections", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sections: ["FAR", "AUD", "REG", "TCP"],
        mandatory: ["FAR", "AUD", "REG"],
        discipline: "TCP",
        disciplineOptions: [{ section: "TCP", name: "Tax Compliance and Planning" }],
      }),
    });
  });

  await page.route("**/api/recordings", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const payload = route.request().postDataJSON?.() ?? {};
    const title = String(payload.title ?? "");
    const contentType = String(payload.contentType ?? "");
    const id = /iphone/i.test(title) || /mp4/i.test(contentType) ? temp.iphoneUploadId : temp.browserUploadId;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        recordingId: id,
        uploadUrl: `${baseUrl}/__workflow-upload/${id}`,
        r2Key: `workflow/${id}/raw.webm`,
        expiresInSec: 900,
      }),
    });
  });

  await page.route("**/__workflow-upload/**", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/recordings/*/complete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ runId: "simulation-no-trigger-call" }),
    });
  });

  await page.route("**/api/anki/*/review", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, newInterval: 1, newEase: 2.5 }),
    });
  });

  await page.route("**/api/topics/*", async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (url.includes("/bulk-refresh-notes")) {
      await route.fallback();
      return;
    }
    if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    if (method === "POST" && url.includes("/refresh-notes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ topicId: "workflow-topic", aiNotes: { coreRule: "No-spend simulation", pitfall: "None", citation: "N/A", performance: "Workflow only" } }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/topics/bulk-refresh-notes", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ processed: 0 }) });
  });

  await page.route("**/api/anki/regenerate**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 0, topicId: "workflow-topic" }) });
  });

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply: "No-spend simulated tutor response." }),
    });
  });

  await page.route("**/api/textbooks/*/reindex", async (route) => {
    const textbookId = new URL(route.request().url()).pathname.split("/").at(-2) ?? "workflow-reindex";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        textbook: {
          id: textbookId,
          title: "Workflow Reindex Preview",
          publisher: "Simulation",
          sections: ["FAR"],
          pages: 10,
          chunkCount: 3,
          indexStatus: "QUEUED",
          sizeBytes: "1024",
          citedCount: 0,
          uploadedAt: iso(),
          indexedAt: null,
        },
      }),
    });
  });

  await page.route("**/api/textbooks", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        textbook: {
          id: "workflow-uploaded-textbook",
          title: "Workflow Uploaded Textbook",
          publisher: "Simulation",
          sections: ["FAR"],
          pages: 12,
          chunkCount: 0,
          indexStatus: "QUEUED",
          sizeBytes: "2048",
          citedCount: 0,
          uploadedAt: iso(),
          indexedAt: null,
        },
      }),
    });
  });
}

async function installMediaMocks(page) {
  await page.addInitScript(() => {
    window.__workflowRecordingCalls = { display: 0, audio: 0, enumerate: 0 };

    function makeScreenStream() {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#f8f5f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#111827";
        ctx.font = "24px sans-serif";
        ctx.fillText("Workflow simulation capture", 32, 56);
      }
      const stream = canvas.captureStream(15);
      const track = stream.getVideoTracks()[0];
      if (track) Object.defineProperty(track, "label", { value: "Workflow screen", configurable: true });
      return stream;
    }

    function makeAudioStream() {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const destination = context.createMediaStreamDestination();
      oscillator.frequency.value = 220;
      oscillator.connect(destination);
      oscillator.start();
      return destination.stream;
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getDisplayMedia: async () => {
          window.__workflowRecordingCalls.display += 1;
          return makeScreenStream();
        },
        getUserMedia: async () => {
          window.__workflowRecordingCalls.audio += 1;
          return makeAudioStream();
        },
        enumerateDevices: async () => {
          window.__workflowRecordingCalls.enumerate += 1;
          return [
            {
              deviceId: "workflow-mic",
              groupId: "workflow-group",
              kind: "audioinput",
              label: "Workflow microphone",
              toJSON: () => ({}),
            },
            {
              deviceId: "default",
              groupId: "workflow-group",
              kind: "audioinput",
              label: "Default microphone",
              toJSON: () => ({}),
            },
          ];
        },
      },
    });
  });
}

async function withPage(browser, name, temp, fn, options = {}) {
  const page = await browser.newPage(options.mobile
    ? { viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
    : { viewport: { width: 1440, height: 950 } });
  const guard = await attachGuards(page, name, Boolean(options.mobile));
  await installNoSpendRoutes(page, temp);
  if (options.media) await installMediaMocks(page);

  try {
    await fn(page, guard);
    await guard.assertHealthy(`${name} final`);
    if (guard.providerRequests.length > 0) {
      throw new Error(`${name} made provider requests:\n${guard.providerRequests.join("\n")}`);
    }
    console.log(`PASS ${name}`);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function loginSetupWorkflow(page, guard) {
  await page.goto(absolute("/login"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toContainText(/hotredsam@gmail.com|Google/i);
  await guard.assertHealthy("login setup");
}

async function dashboardNavigationWorkflow(page, guard) {
  await page.goto(absolute("/"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/hours in/i);
  await page.getByRole("link", { name: /Continue reading/i }).click();
  await expect(page).toHaveURL(/\/study\/[^/]+\/\d+$/);
  await page.keyboard.press("g");
  await page.keyboard.press("y");
  await expect(page).toHaveURL(/\/topics$/);
  await page.keyboard.press("u");
  await expect(page).toHaveURL(/\/study$/);
  await page.keyboard.press("Control+K");
  await page.getByRole("combobox", { name: /search destinations/i }).fill("settings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings/);
  await guard.assertHealthy("dashboard navigation");
}

async function studyWorkflow(page, guard) {
  await page.goto(absolute("/study"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Textbook Study/i);
  await page.getByRole("link", { name: /Start .* from beginning/i }).first().click();
  await expect(page).toHaveURL(/\/study\/[^/]+\/0$/);
  await expect(page.locator("body")).toContainText(/Generated Practice Cards|No indexed cards/i);
  await page.locator('a[aria-label="Next chunk"]:visible').first().click();
  await expect(page).toHaveURL(/\/study\/[^/]+\/1$/);
  await page.locator('a[aria-label="Previous chunk"]:visible').first().click();
  await expect(page).toHaveURL(/\/study\/[^/]+\/0$/);
  await guard.assertHealthy("study reader");
}

async function topicsWorkflow(page, guard) {
  await page.goto(absolute("/topics"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Topics/i);
  await page.getByRole("button", { name: /Sort by Lowest mastery/i }).click();
  await page.getByRole("searchbox", { name: /Search topics/i }).fill("income");
  await page.waitForTimeout(600);
  await page.getByRole("searchbox", { name: /Search topics/i }).fill("");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /click to expand details/i }).first().click();
  await expect(page.getByRole("region", { name: /Details for/i })).toBeVisible();
  await page.getByLabel("Your Notes").first().fill("Workflow simulation note");
  await page.getByLabel("Your Notes").first().blur();
  await page.getByRole("button", { name: /Refresh AI notes for this topic/i }).click();
  await page.getByRole("link", { name: "Open in book" }).first().click();
  await expect(page).toHaveURL(/\/study\/[^/]+\/\d+$/);
  await guard.assertHealthy("topics");
}

async function ankiWorkflow(page, guard) {
  await page.goto(absolute("/anki"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Flashcards/i);
  await page.getByRole("tab", { name: "Practice" }).click();
  const reveal = page.getByLabel(/Card front/i).first();
  if (await reveal.count()) {
    await reveal.click();
    await page.getByRole("button", { name: /Good/i }).first().click();
  }
  await page.getByRole("tab", { name: "Audio" }).click();
  await expect(page.getByRole("tabpanel")).toContainText(/Audio review|Audio deck|Audio review is clear/i);
  await page.getByRole("tab", { name: "Browse" }).click();
  await expect(page.getByRole("tabpanel")).toContainText(/Browse|Cards|Search/i);
  await guard.assertHealthy("anki");
}

async function recordBrowserWorkflow(page, guard) {
  await page.goto(absolute("/record"));
  await page.getByRole("button", { name: "FAR" }).click();
  await expect(page.getByRole("button", { name: /start recording/i })).toBeEnabled();
  await page.getByRole("button", { name: /start recording/i }).click();
  await expect(page.getByRole("region", { name: /recording in progress/i })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Mark moment/i }).click();
  await page.getByRole("button", { name: /Pause/i }).click();
  await page.getByRole("button", { name: /Resume/i }).click();
  await page.getByRole("button", { name: /stop and upload/i }).click();
  await expect(page.getByRole("heading", { name: /recording uploaded/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /view pipeline status/i }).click();
  await expect(page).toHaveURL(new RegExp(`/recordings/${runId}-.+/status$`));
  await expect(page.locator("body")).toContainText(/Realtime stream unavailable|Processing/i);
  await guard.assertHealthy("browser recording upload");
}

async function recordIphoneWorkflow(page, guard) {
  await page.goto(absolute("/record"));
  await expect(page.locator("#screen-recording-upload")).toBeVisible();
  await page.getByRole("button", { name: "FAR" }).click();
  await page.setInputFiles("#screen-recording-upload", {
    name: "iphone-becker-screen-recording.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.alloc(4096, 0x2a),
  });
  await expect(page.getByRole("button", { name: /Upload screen recording file/i })).toBeEnabled();
  await page.getByRole("button", { name: /Upload screen recording file/i }).click();
  await expect(page.getByRole("heading", { name: /recording uploaded/i })).toBeVisible({ timeout: 15_000 });
  await guard.assertHealthy("iphone upload");
}

async function pipelineAndReviewWorkflow(page, guard, temp) {
  await page.goto(absolute("/pipeline"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Recordings/i);
  await expect(page.locator("body")).toContainText("Workflow Simulation Processing Session");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Workflow Simulation Processing Session" })
    .getByRole("link", { name: /Preview/i })
    .click();
  await expect(page).toHaveURL(new RegExp(`/recordings/${temp.processingId}/status$`));
  await expect(page.locator("body")).toContainText(/Realtime stream unavailable|Questions so far/i);
  await page.goto(absolute("/pipeline"));
  await page.getByRole("tab", { name: /Previous/i }).click();
  await page.getByRole("link", { name: /Workflow Simulation Completed Session/i }).click();
  await expect(page).toHaveURL(new RegExp(`/review/${temp.doneId}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toContainText(/Workflow simulation question 1/i);
  await page.getByRole("tab", { name: /Question 2/i }).click();
  await expect(page.locator("body")).toContainText(/Workflow simulation question 2/i);
  await page.keyboard.press("ArrowLeft");
  await guard.assertHealthy("pipeline and review");
}

async function libraryWorkflow(page, guard) {
  await page.goto(absolute("/library"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Textbooks/i);
  await page.getByRole("button", { name: /Upload textbook/i }).click();
  const uploadDialog = page.getByRole("dialog", { name: /Upload textbook/i });
  await expect(uploadDialog).toBeVisible();
  await uploadDialog.getByLabel(/^Title/).fill("Workflow Uploaded Textbook");
  await uploadDialog.getByLabel("Publisher").fill("Simulation");
  await uploadDialog.getByRole("button", { name: "FAR", exact: true }).click();
  await page.setInputFiles("#tb-file", {
    name: "workflow-upload.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 workflow simulation\n"),
  });
  await uploadDialog.getByRole("button", { name: /^Upload$/ }).click();
  await expect(page.getByText("Workflow Uploaded Textbook")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Re-index/i }).first().click();
  await page.getByRole("link", { name: /^Open / }).nth(1).click();
  await expect(page).toHaveURL(/\/library\/[^/]+$/);
  await page.getByRole("button", { name: /Next chunk/i }).click();
  await page.keyboard.press("ArrowLeft");
  await guard.assertHealthy("library");
}

async function settingsWorkflow(page, guard) {
  await page.goto(absolute("/settings"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Settings/i);
  for (const tab of ["Models & API", "Appearance", "Indexing", "Danger Zone", "Study Schedule"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await guard.assertHealthy(`settings ${tab}`);
  }
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await guard.assertHealthy("settings");
}

async function secondaryPagesWorkflow(page, guard) {
  for (const route of ["/sessions", "/analytics"]) {
    await page.goto(absolute(route));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await guard.assertHealthy(`secondary ${route}`);
  }
}

async function mobileWorkflow(page, guard) {
  await page.goto(absolute("/"));
  const nav = page.getByRole("navigation", { name: /Main navigation/i });
  await nav.getByRole("link", { name: "Anki", exact: true }).tap();
  await expect(page).toHaveURL(/\/anki$/);
  await page.getByRole("tab", { name: "Audio" }).tap();
  await expect(page.getByRole("tabpanel")).toContainText(/Audio review|Audio deck|Audio review is clear/i);
  await page.goto(absolute("/record"));
  await expect(page.locator("#screen-recording-upload")).toBeVisible();
  await page.goto(absolute("/study"));
  await page.getByRole("link", { name: /Start .* from beginning/i }).first().tap();
  await expect(page.getByRole("navigation", { name: /Chunk navigation/i })).toBeVisible();
  await page.goto(absolute("/topics"));
  await page.getByRole("searchbox", { name: /Search topics/i }).fill("income");
  await guard.assertHealthy("mobile primary workflows");
}

async function main() {
  const temp = await createTempData();
  const browser = await chromium.launch();

  try {
    await withPage(browser, "login setup", temp, loginSetupWorkflow);
    await withPage(browser, "dashboard navigation", temp, dashboardNavigationWorkflow);
    await withPage(browser, "study textbook", temp, studyWorkflow);
    await withPage(browser, "topics", temp, topicsWorkflow);
    await withPage(browser, "anki", temp, ankiWorkflow);
    await withPage(browser, "record browser", temp, recordBrowserWorkflow, { media: true });
    await withPage(browser, "record iphone upload", temp, recordIphoneWorkflow);
    await withPage(browser, "pipeline and review", temp, (page, guard) => pipelineAndReviewWorkflow(page, guard, temp));
    await withPage(browser, "library", temp, libraryWorkflow);
    await withPage(browser, "settings", temp, settingsWorkflow);
    await withPage(browser, "sessions and analytics", temp, secondaryPagesWorkflow);
    await withPage(browser, "mobile primary", temp, mobileWorkflow, { mobile: true });
  } finally {
    await browser.close().catch(() => undefined);
    await cleanupTempData([temp.doneId, temp.processingId, temp.browserUploadId, temp.iphoneUploadId]).catch(() => undefined);
    await prisma.$disconnect();
  }

  console.log("Real workflow simulation passed without provider calls.");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
