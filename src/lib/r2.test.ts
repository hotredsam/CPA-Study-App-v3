import { describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  env: {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-key",
    R2_SECRET_ACCESS_KEY: "test-secret",
    R2_BUCKET_NAME: "test-bucket",
    NODE_ENV: "test",
  },
}));

import { keys } from "./r2";

describe("r2 key conventions", () => {
  it("builds recording keys from ids", () => {
    expect(keys.recordingRaw("abc")).toBe("recordings/abc/raw.webm");
    expect(keys.recordingAudio("abc")).toBe("recordings/abc/audio.wav");
  });

  it("builds clip keys from question ids", () => {
    expect(keys.clipVideo("q1")).toBe("clips/q1/clip.webm");
    expect(keys.clipAudio("q1")).toBe("clips/q1/audio.wav");
    expect(keys.clipThumbnail("q1")).toBe("clips/q1/thumbnail.jpg");
  });

  it("zero-pads frame indices to 3 digits", () => {
    expect(keys.questionFrame("q1", 0)).toBe("clips/q1/question-frames/000.jpg");
    expect(keys.questionFrame("q1", 42)).toBe("clips/q1/question-frames/042.jpg");
    expect(keys.feedbackFrame("q1", 999)).toBe("clips/q1/feedback-frames/999.jpg");
  });
});
