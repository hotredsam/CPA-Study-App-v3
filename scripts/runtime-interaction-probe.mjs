#!/usr/bin/env node
import { chromium } from "@playwright/test";

const baseUrl = process.env.RUNTIME_PROBE_BASE_URL ?? "http://localhost:3000";
const maxDepth = Number(process.env.RUNTIME_PROBE_DEPTH ?? "5");
const maxSequencesPerRoute = Number(process.env.RUNTIME_PROBE_MAX_SEQUENCES ?? "75");
const maxActionsPerState = Number(process.env.RUNTIME_PROBE_MAX_ACTIONS ?? "12");
const mobileProfile = process.argv.includes("--mobile") || process.env.RUNTIME_PROBE_PROFILE === "mobile";

const defaultRoutes = [
  "/",
  "/login",
  "/record",
  "/pipeline",
  "/review",
  "/topics",
  "/study",
  "/anki",
  "/library",
  "/settings",
  "/sessions",
  "/analytics",
];

const routes = process.env.RUNTIME_PROBE_ROUTES
  ? process.env.RUNTIME_PROBE_ROUTES.split(",").map((route) => route.trim()).filter(Boolean)
  : defaultRoutes;

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
];

const unsafeButtonPattern =
  /allow access|upload|delete|remove|clear|wipe|seed|save|start|stop|record|process|reindex|regenerate|activate|submit|create|add|import|grade|run|apply/i;

const safeButtonPattern =
  /dashboard|record|pipeline|review|topics|study|anki|library|settings|sessions|analytics|general|indexing|models|practice|browse|daily|path|retry|cancel|close|back|next|previous/i;

const keyActions = ["Tab", "Escape", "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].map((key) => ({
  kind: "key",
  key,
  label: key,
}));

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function urlFor(path) {
  return new URL(path, baseUrl).toString();
}

function actionKey(action) {
  return JSON.stringify(action);
}

function sequenceKey(sequence) {
  return sequence.map(actionKey).join(" > ");
}

function describeSequence(sequence) {
  return sequence.length === 0 ? "(initial render)" : sequence.map((action) => action.label).join(" -> ");
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(200);
}

async function assertHealthy(page, route, sequence, telemetry) {
  const url = page.url();
  const body = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
  const matched = crashPatterns.find((pattern) => pattern.test(body));

  if (matched) {
    throw new Error(`${route} ${describeSequence(sequence)} showed crash text ${matched}: ${url}`);
  }

  const serverError = telemetry.responses.find((entry) => entry.status >= 500);
  if (serverError) {
    throw new Error(
      `${route} ${describeSequence(sequence)} received HTTP ${serverError.status} from ${serverError.url}`,
    );
  }

  if (telemetry.pageErrors.length > 0) {
    throw new Error(`${route} ${describeSequence(sequence)} page errors: ${telemetry.pageErrors.join(" | ")}`);
  }

  const fatalConsole = telemetry.consoleErrors.find((message) => crashPatterns.some((pattern) => pattern.test(message)));
  if (fatalConsole) {
    throw new Error(`${route} ${describeSequence(sequence)} console crash: ${fatalConsole}`);
  }
}

async function collectActions(page) {
  const clickActions = await page.evaluate(({ unsafeSource, safeSource }) => {
    const unsafe = new RegExp(unsafeSource, "i");
    const safe = new RegExp(safeSource, "i");
    const origin = window.location.origin;

    function isVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }

    function labelFor(element) {
      return [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.textContent,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const actions = [];

    for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
      if (!isVisible(anchor)) continue;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

      const parsed = new URL(href, window.location.href);
      if (parsed.origin !== origin || parsed.pathname.startsWith("/api")) continue;

      const label = labelFor(anchor) || parsed.pathname;
      actions.push({
        kind: "link",
        href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
        label,
      });
    }

    for (const button of Array.from(document.querySelectorAll("button,[role='tab']"))) {
      if (!isVisible(button)) continue;
      if (button.disabled || button.getAttribute("aria-disabled") === "true") continue;

      const label = labelFor(button);
      if (!label || unsafe.test(label)) continue;

      const role = button.getAttribute("role") ?? (button.tagName.toLowerCase() === "button" ? "button" : "");
      if (role !== "tab" && !safe.test(label)) continue;

      actions.push({
        kind: role === "tab" ? "tab" : "button",
        label,
      });
    }

    return actions;
  }, {
    unsafeSource: unsafeButtonPattern.source,
    safeSource: safeButtonPattern.source,
  });

  const seen = new Set();
  const unique = [];

  for (const action of [...clickActions, ...keyActions]) {
    const key = actionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(action);
    if (unique.length >= maxActionsPerState) break;
  }

  return unique;
}

async function performAction(page, action) {
  if (action.kind === "key") {
    await page.keyboard.press(action.key);
    return true;
  }

  if (action.kind === "link") {
    const hrefPattern = new RegExp(`^${escapeRegex(action.href)}(?:$|#|\\?)`);
    const byHref = page.locator("a[href]");
    const count = await byHref.count();

    for (let index = 0; index < count; index += 1) {
      const candidate = byHref.nth(index);
      const href = await candidate.getAttribute("href");
      if (!href) continue;
      const parsed = new URL(href, page.url());
      const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (!hrefPattern.test(normalized)) continue;
      await candidate.click({ timeout: 5_000, noWaitAfter: true });
      return true;
    }

    return false;
  }

  const role = action.kind === "tab" ? "tab" : "button";
  const locator = page.getByRole(role, { name: new RegExp(escapeRegex(action.label), "i") }).first();
  if ((await locator.count()) === 0) return false;
  await locator.click({ timeout: 5_000, noWaitAfter: true });
  return true;
}

async function newProbedPage(context) {
  const page = await context.newPage();
  const telemetry = {
    consoleErrors: [],
    pageErrors: [],
    responses: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => telemetry.pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      telemetry.responses.push({ status: response.status(), url: response.url() });
    }
  });

  return { page, telemetry };
}

async function replay(context, route, sequence) {
  const { page, telemetry } = await newProbedPage(context);
  await page.goto(urlFor(route), { waitUntil: "domcontentloaded" });
  await settle(page);
  await assertHealthy(page, route, [], telemetry);

  const replayed = [];
  for (const action of sequence) {
    const performed = await performAction(page, action);
    if (!performed) {
      await page.close();
      return { page: null, telemetry, replayed };
    }
    replayed.push(action);
    await settle(page);
    await assertHealthy(page, route, replayed, telemetry);
  }

  return { page, telemetry, replayed };
}

async function probeRoute(context, route) {
  const queue = [[]];
  const queued = new Set([sequenceKey([])]);
  let checked = 0;

  while (queue.length > 0 && checked < maxSequencesPerRoute) {
    const sequence = queue.shift();
    if (!sequence) break;

    const result = await replay(context, route, sequence);
    checked += 1;

    if (!result.page) continue;

    if (sequence.length < maxDepth) {
      const actions = await collectActions(result.page);
      for (const action of actions) {
        const next = [...sequence, action];
        const key = sequenceKey(next);
        if (queued.has(key)) continue;
        queued.add(key);
        queue.push(next);
      }
    }

    await assertHealthy(result.page, route, sequence, result.telemetry);
    await result.page.close();
  }

  console.log(`Probed ${checked} interaction sequences on ${route}`);
  return checked;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: {
      width: Number(process.env.RUNTIME_PROBE_VIEWPORT_WIDTH ?? (mobileProfile ? "440" : "1440")),
      height: Number(process.env.RUNTIME_PROBE_VIEWPORT_HEIGHT ?? (mobileProfile ? "956" : "1000")),
    },
    isMobile: process.env.RUNTIME_PROBE_MOBILE === "true" || mobileProfile,
    hasTouch: process.env.RUNTIME_PROBE_TOUCH === "true" || mobileProfile,
  });

  let total = 0;

  try {
    for (const route of routes) {
      total += await probeRoute(context, route);
    }
  } finally {
    await browser.close();
  }

  console.log(`Runtime interaction probe passed: ${total} non-destructive sequences, depth ${maxDepth}.`);
}

await main();
