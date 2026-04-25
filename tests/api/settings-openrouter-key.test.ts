import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Set ENCRYPTION_KEY before any imports
process.env["ENCRYPTION_KEY"] = "c".repeat(64);

// Mock @/lib/prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const { POST, GET } = await import(
  "@/app/api/settings/openrouter-key/route"
);
const { prisma } = await import("@/lib/prisma");

const mockUpsert = vi.mocked(prisma.userSettings.upsert);
const mockFindUnique = vi.mocked(prisma.userSettings.findUnique);

describe("POST /api/settings/openrouter-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({
      id: "singleton",
      openRouterKeyEnc: "encrypted-value",
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });
  });

  it("returns { success: true } on valid key", async () => {
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "sk-or-real-key-abc123" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("never echoes the key back in the response", async () => {
    const secretKey = "sk-or-super-secret-key";
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: secretKey }),
    });

    const res = await POST(req);
    const text = await res.text();

    expect(text).not.toContain(secretKey);
  });

  it("returns 400 on empty key", async () => {
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on whitespace-only key", async () => {
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when key field is missing", async () => {
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("stores an encrypted value (not the plaintext key) in the DB", async () => {
    const plainKey = "sk-or-plaintext-test-key";
    const req = new NextRequest("http://localhost/api/settings/openrouter-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: plainKey }),
    });

    await POST(req);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockUpsert.mock.calls[0];
    // The encrypted value stored in create/update should NOT equal the plaintext
    const storedEnc = (upsertCall?.[0] as { create: { openRouterKeyEnc: string } })?.create?.openRouterKeyEnc;
    expect(storedEnc).not.toBe(plainKey);
    // Should be in iv:authTag:ciphertext format
    expect(storedEnc?.split(":").length).toBe(3);
  });
});

describe("GET /api/settings/openrouter-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { hasKey: false } when no settings row exists", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json() as { hasKey: boolean };
    expect(body.hasKey).toBe(false);
  });

  it("returns { hasKey: false } when openRouterKeyEnc is null", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "singleton",
      openRouterKeyEnc: null,
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });

    const res = await GET();
    const body = await res.json() as { hasKey: boolean };
    expect(body.hasKey).toBe(false);
  });

  it("returns { hasKey: true } when openRouterKeyEnc is set", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "singleton",
      openRouterKeyEnc: "iv-hex:tag-hex:cipher-hex",
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });

    const res = await GET();
    const body = await res.json() as { hasKey: boolean };
    expect(body.hasKey).toBe(true);
  });

  it("never returns the encrypted key value in the response", async () => {
    const encryptedVal = "aabbcc:ddeeff:001122334455";
    mockFindUnique.mockResolvedValueOnce({
      id: "singleton",
      openRouterKeyEnc: encryptedVal,
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      activeModelConfig: null,
      examSections: null,
      updatedAt: new Date(),
    });

    const res = await GET();
    const text = await res.text();
    expect(text).not.toContain(encryptedVal);
  });
});
