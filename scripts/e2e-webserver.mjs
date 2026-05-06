#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cleanNextDist } from "./next-dist.mjs";

const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "pnpm exec next dev -p 3001"]
  : ["exec", "next", "dev", "-p", "3001"];
const childEnv = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
};

cleanNextDist(".next-e2e");

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: childEnv,
  stdio: "inherit",
});

function shutdown(signal) {
  if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
