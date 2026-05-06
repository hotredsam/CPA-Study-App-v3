#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cleanNextDist } from "./next-dist.mjs";

const distDirs = process.argv.slice(2);
const killResult = spawnSync(process.execPath, ["scripts/kill-dev-ports.mjs"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if ((killResult.status ?? 0) !== 0) {
  process.exit(killResult.status ?? 1);
}

for (const distDir of distDirs.length > 0 ? distDirs : [".next"]) {
  cleanNextDist(distDir);
}
