import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;

export type ClaudeOpts = {
  systemPrompt?: string;
  timeoutMs?: number;
};

/**
 * Calls the `claude` CLI in print mode and returns trimmed stdout.
 *
 * Spawns: claude -p "<prompt>" [--system-prompt "<system>"] --output-format text
 *
 * Rejects if the process exits non-zero or errors out.
 */
export async function callClaude(prompt: string, opts: ClaudeOpts = {}): Promise<string> {
  const { systemPrompt, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  const args: string[] = ["-p", prompt];
  if (systemPrompt) {
    args.push("--system-prompt", systemPrompt);
  }
  // --output-format text (print mode, bare output)
  args.push("--output-format", "text");

  return new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const proc = spawn("claude", args, { shell: false });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill("SIGTERM");
      reject(new Error(`callClaude timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`callClaude spawn error: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `callClaude exited with code ${code}. stderr: ${stderr.slice(-500)}`
          )
        );
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Finds and parses the first top-level JSON object `{...}` in a response string.
 * Claude sometimes wraps JSON in prose; this strips the wrapper.
 *
 * Throws if no JSON object is found.
 */
export function extractJsonFromResponse(raw: string): unknown {
  // Find the first opening brace
  const start = raw.indexOf("{");
  if (start === -1) {
    throw new Error(`extractJsonFromResponse: no JSON object found in response. Got: ${raw.slice(0, 200)}`);
  }

  // Walk forward matching braces to find the end of the top-level object
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const jsonStr = raw.slice(start, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (err) {
          throw new Error(
            `extractJsonFromResponse: found JSON-like block but parse failed: ${(err as Error).message}. Block: ${jsonStr.slice(0, 200)}`
          );
        }
      }
    }
  }

  throw new Error(
    `extractJsonFromResponse: found opening brace but no matching closing brace. Raw: ${raw.slice(0, 200)}`
  );
}
