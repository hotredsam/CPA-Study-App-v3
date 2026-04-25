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

function envOpenRouterKey(): string | null {
  if (process.env.NODE_ENV === "test") return null;
  const key = normalizeOpenRouterKey(process.env["OPENROUTER_API_KEY"] ?? "");
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

function estimateCost(promptTokens: number, completionTokens: number): number {
  // Placeholder cost estimate — real cost would come from OpenRouter's usage object
  return promptTokens * 0.000001 + completionTokens * 0.000002;
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
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
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
    const usdCost = estimateCost(inputTokens, outputTokens);

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
