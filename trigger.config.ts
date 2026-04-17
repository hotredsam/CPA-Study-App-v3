import { defineConfig } from "@trigger.dev/sdk/v3";

// Build extensions (ffmpeg + whisper.cpp + model weights) are layered in during
// Task 3 — see .claude/skills/trigger-dev-v3/SKILL.md for the full shape.
// Keeping the config minimal here so `npx trigger.dev@latest dev` can boot.

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "cpa-study-v3-placeholder",
  runtime: "node",
  logLevel: "info",
  maxDuration: 900,
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
      randomize: true,
    },
  },
});
