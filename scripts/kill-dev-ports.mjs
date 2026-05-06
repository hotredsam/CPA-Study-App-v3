#!/usr/bin/env node
// Cross-platform port reclaim for ports 3000 and 3001.
// On Windows, delegates to the PowerShell companion. On other OSes uses lsof + kill.
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORTS = [3000, 3001];

if (process.platform === "win32") {
  const script = fileURLToPath(new URL("./kill-dev-ports.ps1", import.meta.url));
  const shells = ["pwsh", "powershell.exe"];

  for (const shell of shells) {
    const result = spawnSync(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
      stdio: "inherit",
    });

    if (!result.error) {
      process.exit(result.status ?? 0);
    }
  }

  console.error("Unable to find PowerShell to reclaim Next.js dev ports.");
  process.exit(1);
}

for (const port of PORTS) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (!pids) continue;
    execSync(`kill -9 ${pids}`);
    console.log(`Killed pids ${pids} on port ${port}`);
  } catch {
    // Port not in use, or lsof unavailable.
  }
}
