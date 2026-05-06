import { existsSync, rmSync } from "node:fs";
import { relative, resolve } from "node:path";

export function cleanNextDist(distDir) {
  if (!distDir || typeof distDir !== "string") {
    throw new Error("A Next.js dist directory is required.");
  }

  if (!/^\.next(?:-[A-Za-z0-9_-]+)?$/.test(distDir)) {
    throw new Error(`Refusing to clean unsafe Next.js dist directory: ${distDir}`);
  }

  const workspace = resolve(process.cwd());
  const target = resolve(workspace, distDir);
  const relativeTarget = relative(workspace, target);

  if (relativeTarget.startsWith("..") || relativeTarget === "" || resolve(target) === workspace) {
    throw new Error(`Refusing to clean path outside the workspace: ${target}`);
  }

  if (!existsSync(target)) return;
  rmSync(target, { recursive: true, force: true });
  console.log(`Removed stale Next.js dist directory ${relativeTarget}`);
}
