import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Must set ENCRYPTION_KEY before importing crypto/openrouter
const TEST_KEY_HEX = "a".repeat(64); // 32 bytes of 0xaa
process.env["ENCRYPTION_KEY"] = TEST_KEY_HEX;

// Mock @/lib/prisma before importing openrouter (which imports it)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      findUnique: vi.fn(),
    },
  },
}));

// Lazily import after mocks are set up
const { callOpenRouter } = await import("@/lib/llm/openrouter");
const { encryptKey } = await import("@/lib/llm/crypto");
const { prisma } = await import("@/lib/prisma");

const encryptedTestKey = encryptKey("sk-or-test-key-123");

// Helper to build a valid OpenRouter success response
function makeSuccessResponse(
  content: string,
  promptTokens = 10,
  completionTokens = 20,
  model = "anthropic/claude-3-5-sonnet",
): Response {
  const body = JSON.stringify({
    model,
    choices: [{ message: { content } }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
}

describe("callOpenRouter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: UserSettings returns a valid encrypted key
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      id: "singleton",
      openRouterKeyEnc: encryptedTestKey,
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns correct LLMCallResult on 200 response", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeSuccessResponse("Hello CPA student", 15, 25));

    const result = await callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "What is GAAP?" }],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.content).toBe("Hello CPA student");
    expect(result.inputTokens).toBe(15);
    expect(result.outputTokens).toBe(25);
    expect(result.usdCost).toBeCloseTo(15 * 0.000001 + 25 * 0.000002, 10);
    expect(result.model).toBe("anthropic/claude-3-5-sonnet");
  });

  it("retries on 429 and succeeds on 3rd attempt", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(makeSuccessResponse("Retry worked"));

    // Run with fake timers — advance past backoff delays
    const resultPromise = callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    // Advance timers for retry delays: 1s then 2s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await resultPromise;

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.content).toBe("Retry worked");
  });

  it("throws after 3 consecutive 5xx responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(new Response("server error", { status: 503 }))
      .mockResolvedValueOnce(new Response("server error", { status: 500 }));

    const callPromise = callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    // Attach rejection handler immediately to prevent unhandled rejection warning
    const resultPromise = expect(callPromise).rejects.toThrow(/OpenRouter returned 50/);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await resultPromise;
  });

  it("throws when OpenRouter key not configured", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValueOnce(null);

    await expect(
      callOpenRouter({
        model: "anthropic/claude-3-5-sonnet",
        messages: [{ role: "user", content: "test" }],
      }),
    ).rejects.toThrow("OpenRouter key not configured");
  });

  it("sends Authorization header with decrypted key", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeSuccessResponse("ok"));

    await callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key-123");
    expect(headers["HTTP-Referer"]).toBe("https://cpa-study-app.local");
    expect(headers["X-Title"]).toBe("CPA Study App");
  });

  it("normalizes pasted keys wrapped in angle brackets", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValueOnce({
      id: "singleton",
      openRouterKeyEnc: encryptKey("<sk-or-test-key-456>"),
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeSuccessResponse("ok"));

    await callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-or-test-key-456");
  });

  it("includes json_schema in body when jsonSchema param is provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeSuccessResponse('{"score":5}'));

    const schema = { type: "object", properties: { score: { type: "number" } } };

    await callOpenRouter({
      model: "anthropic/claude-3-5-sonnet",
      messages: [{ role: "user", content: "test" }],
      jsonSchema: schema,
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as {
      response_format: { type: string; json_schema: { name: string; schema: unknown } };
    };
    expect(sentBody.response_format.type).toBe("json_schema");
    expect(sentBody.response_format.json_schema.name).toBe("response");
    expect(sentBody.response_format.json_schema.schema).toEqual(schema);
  });
});
