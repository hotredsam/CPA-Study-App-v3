import { describe, expect, it } from "vitest";
import { parseFfmpegPctFromChunk, parseWhisperPctFromChunk } from "./progress-parsers";

describe("parseFfmpegPctFromChunk", () => {
  it("returns the latest time= line as a pct", () => {
    const chunk =
      "frame=10 time=00:00:05.00\nframe=20 time=00:00:10.50\nframe=30 time=00:00:15.25\n";
    const pct = parseFfmpegPctFromChunk(chunk, 60);
    expect(pct).toBe(25);
  });

  it("clamps pct to 100", () => {
    expect(parseFfmpegPctFromChunk("time=00:02:00.00", 60)).toBe(100);
  });

  it("returns null without a time= match", () => {
    expect(parseFfmpegPctFromChunk("nothing here", 60)).toBeNull();
  });

  it("returns null for zero duration", () => {
    expect(parseFfmpegPctFromChunk("time=00:00:01.00", 0)).toBeNull();
  });
});

describe("parseWhisperPctFromChunk", () => {
  it("uses the end-timestamp of the latest line", () => {
    const chunk =
      "[00:00:00.000 --> 00:00:05.000]  hi\n[00:00:05.000 --> 00:00:12.500]  world\n";
    const pct = parseWhisperPctFromChunk(chunk, 50);
    expect(pct).toBe(25);
  });

  it("clamps pct to 100", () => {
    expect(parseWhisperPctFromChunk("[00:00:00.000 --> 00:02:00.000]", 60)).toBe(100);
  });

  it("returns null without a whisper timestamp line", () => {
    expect(parseWhisperPctFromChunk("just text", 10)).toBeNull();
  });
});
