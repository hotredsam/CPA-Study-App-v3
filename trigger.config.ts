import { defineConfig } from "@trigger.dev/sdk/v3";

const projectId = process.env.TRIGGER_PROJECT_ID;
if (!projectId || projectId.includes("placeholder")) {
  throw new Error("TRIGGER_PROJECT_ID is not set correctly — see .env.example");
}

export default defineConfig({
  project: projectId,
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
