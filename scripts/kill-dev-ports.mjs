#!/usr/bin/env node
// Cross-platform port reclaim for Next.js ports.
// On Windows, delegates to the PowerShell companion. On other OSes uses lsof + kill.
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parsePorts(args) {
  if (args.length === 0) return [3000, 3001];
  const ports = args.map((value) => Number(value));
  const invalid = ports.find((port) => !Number.isInteger(port) || port < 1 || port > 65535);
  if (invalid !== undefined) {
    throw new Error(`Invalid port: ${invalid}`);
  }
  return [...new Set(ports)];
}

const PORTS = parsePorts(process.argv.slice(2));

if (process.platform === "win32") {
  const script = fileURLToPath(new URL("./kill-dev-ports.ps1", import.meta.url));
  const shells = ["pwsh", "powershell.exe"];

  for (const shell of shells) {
    const result = spawnSync(shell, [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
      "-Ports",
      ...PORTS.map(String),
    ], {
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
