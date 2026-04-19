// TODO: OpenRouter does not expose Anthropic's prompt-cache primitive yet.

export const PROMPT_CACHE_SUPPORTED_MODELS: string[] = [
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.5",
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3-haiku",
  "local/claude",
];

/**
 * Injects Anthropic prompt-cache headers when the model is an Anthropic or local model.
 * For OpenRouter-proxied models this is a no-op since OpenRouter does not expose the
 * Anthropic prompt-cache primitive.
 */
export function addPromptCacheHeaders(
  headers: Record<string, string>,
  model: string,
): Record<string, string> {
  if (model.startsWith("anthropic/") || model.startsWith("local/")) {
    return {
      ...headers,
      "anthropic-beta": "prompt-caching-2024-07-31",
    };
  }
  return headers;
}
