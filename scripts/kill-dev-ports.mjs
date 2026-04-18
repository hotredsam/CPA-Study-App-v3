#!/usr/bin/env node
// Cross-platform port reclaim for ports 3000 and 3001 (Next.js / Trigger.dev dashboard).
// On Windows, delegates to the PowerShell companion. On other OSes uses lsof + kill.
import { execSync, spawnSync } from "node:child_process";

const PORTS = [3000, 3001];

if (process.platform === "win32") {
  const script = new URL("./kill-dev-ports.ps1", import.meta.url).pathname.slice(1);
  const result = spawnSync("pwsh", ["-File", script], { stdio: "inherit" });
  process.exit(result.status ?? 0);
}

// Unix: lsof -ti :<port> | xargs kill -9 (best-effort, ignore errors)
for (const port of PORTS) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (!pids) continue;
    execSync(`kill -9 ${pids}`);
    console.log(`Killed pids ${pids} on port ${port}`);
  } catch {
    // port not in use — fine
  }
}
