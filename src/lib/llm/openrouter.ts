import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { decryptKey } from "./crypto";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallParams {
  model: string;
  messages: LLMMessage[];
  /** If set, use response_format: { type: 'json_schema', json_schema: { name: 'response', schema: jsonSchema } } */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  /** Hint for logging only */
  cacheKey?: string;
  /** Hint for logging only */
  batchHint?: boolean;
}

export interface LLMCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  model: string;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

function normalizeOpenRouterKey(value: string): string {
  let key = value.trim();
  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice("bearer ".length).trim();
  }
  if (key.startsWith("<") && key.endsWith(">")) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function repoEnvOpenRouterKey(): string | null {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    return null;
  }

  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return null;

  const envText = readFileSync(envPath, "utf8");
  const match = envText.match(/^OPENROUTER_API_KEY\s*=\s*(.*)$/m);
  const raw = match?.[1];
  if (!raw) return null;

  const key = normalizeOpenRouterKey(unquoteEnvValue(raw));
  return key.length > 0 ? key : null;
}

function envOpenRouterKey(): string | null {
  if (process.env.NODE_ENV === "test") return null;
  const key = repoEnvOpenRouterKey() ?? normalizeOpenRouterKey(process.env["OPENROUTER_API_KEY"] ?? "");
  return key && key.length > 0 ? key : null;
}

export async function getOpenRouterApiKey(): Promise<string> {
  const envKey = envOpenRouterKey();
  if (envKey) return envKey;

  const settings = await prisma.userSettings.findUnique({
    where: { id: "singleton" },
    select: { openRouterKeyEnc: true },
  });

  if (!settings?.openRouterKeyEnc) {
    throw new Error("OpenRouter key not configured");
  }

  return normalizeOpenRouterKey(decryptKey(settings.openRouterKeyEnc));
}

export async function hasOpenRouterKeyConfigured(): Promise<boolean> {
  if (envOpenRouterKey()) return true;

  const settings = await prisma.userSettings.findUnique({
    where: { id: "singleton" },
    select: { openRouterKeyEnc: true },
  });

  return settings?.openRouterKeyEnc != null;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface OpenRouterChoice {
  message: {
    content: string;
  };
}

interface OpenRouterResponse {
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

const FALLBACK_PRICING_PER_M_TOKENS = {
  input: 1,
  output: 2,
};

const MODEL_PRICING_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  "anthropic/claude-haiku-4.5": { input: 1, output: 5 },
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
};

function normalizeModelForPricing(model: string): string {
  return model.trim().replace(/:.+$/, "");
}

export function estimateOpenRouterCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing =
    MODEL_PRICING_PER_M_TOKENS[normalizeModelForPricing(model)] ??
    FALLBACK_PRICING_PER_M_TOKENS;
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Call OpenRouter's chat completions API.
 * Retries up to 3 times on 429 or 5xx with exponential backoff (1s, 2s, 4s).
 */
export async function callOpenRouter(
  params: LLMCallParams,
): Promise<LLMCallResult> {
  const apiKey = await getOpenRouterApiKey();

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
  };

  if (params.maxTokens !== undefined) {
    body["max_tokens"] = params.maxTokens;
  }

  if (params.jsonSchema !== undefined) {
    body["response_format"] = {
      type: "json_schema",
      json_schema: {
        name: "response",
        schema: params.jsonSchema,
      },
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }

    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://cpa-study-app.local",
          "X-Title": "CPA Study App",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      lastError = err instanceof Error && err.name === "AbortError"
        ? new Error(`OpenRouter timed out after ${REQUEST_TIMEOUT_MS}ms on attempt ${attempt + 1}`)
        : err instanceof Error
          ? err
          : new Error(String(err));
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (isRetryableStatus(response.status)) {
      lastError = new Error(
        `OpenRouter returned ${response.status} on attempt ${attempt + 1}`,
      );
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "(unreadable body)");
      throw new Error(
        `OpenRouter error ${response.status}: ${text.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as OpenRouterResponse;

    const firstChoice = data.choices[0];
    if (!firstChoice) {
      throw new Error("OpenRouter returned no choices in response");
    }

    const content = firstChoice.message.content;
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const usdCost = estimateOpenRouterCostUsd(data.model || params.model, inputTokens, outputTokens);

    return {
      content,
      inputTokens,
      outputTokens,
      usdCost,
      model: data.model,
    };
  }

  throw lastError ?? new Error(`OpenRouter failed after ${MAX_RETRIES} attempts`);
}
