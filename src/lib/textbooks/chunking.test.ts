import { describe, expect, it } from "vitest";
import { createTextbookChunkDrafts } from "./chunking";

describe("createTextbookChunkDrafts", () => {
  it("splits page text into ordered overlapping chunks", () => {
    const words = Array.from({ length: 300 }, (_, index) => `w${index + 1}`);
    const chunks = createTextbookChunkDrafts({
      pages: [{ pageNumber: 1, text: words.join(" ") }],
      chunkSize: 128,
      overlapWindow: 28,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.order).toBe(0);
    expect(chunks[1]?.content.startsWith("w101 ")).toBe(true);
    expect(chunks[0]?.chapterRef).toBe("Page 1");
  });

  it("does not create a trailing tiny chunk", () => {
    const words = Array.from({ length: 160 }, (_, index) => `w${index + 1}`);
    const chunks = createTextbookChunkDrafts({
      pages: [{ pageNumber: 3, text: words.join(" ") }],
      chunkSize: 128,
      overlapWindow: 64,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[1]?.chapterRef).toBe("Page 3");
  });
});
