import { describe, expect, it } from "vitest";
import { hello } from "./hello";

describe("hello", () => {
  it("greets the given name", () => {
    expect(hello("sam")).toBe("hello, sam");
  });

  it("handles empty strings", () => {
    expect(hello("")).toBe("hello, ");
  });
});
