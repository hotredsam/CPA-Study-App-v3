import { describe, expect, it } from "vitest";
import { parseSceneTimestamps } from "./ffmpeg";

describe("parseSceneTimestamps", () => {
  it("pulls pts_time values from a showinfo stderr dump", () => {
    const stderr = [
      "[Parsed_showinfo_1 @ 0x1] n:0 pts:12000 pts_time:12.000 pos:123",
      "[Parsed_showinfo_1 @ 0x1] n:1 pts:45000 pts_time:45.500 pos:456",
      "[Parsed_showinfo_1 @ 0x1] n:2 pts:90000 pts_time:90.25 pos:789",
    ].join("\n");
    expect(parseSceneTimestamps(stderr)).toEqual([12, 45.5, 90.25]);
  });

  it("returns empty when no scenes were detected", () => {
    expect(parseSceneTimestamps("nothing interesting here")).toEqual([]);
  });
});
