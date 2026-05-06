import { describe, expect, it } from "vitest";
import {
  beckerUnitPrefixForSection,
  inferBeckerModuleLabel,
  inferBeckerModuleNumber,
  inferBeckerUnitLabel,
} from "./becker-units";

describe("Becker unit inference", () => {
  it("uses Becker section prefixes for core and discipline sections", () => {
    expect(beckerUnitPrefixForSection("AUD")).toBe("A");
    expect(beckerUnitPrefixForSection("FAR")).toBe("F");
    expect(beckerUnitPrefixForSection("REG")).toBe("R");
    expect(beckerUnitPrefixForSection("BAR")).toBe("B");
    expect(beckerUnitPrefixForSection("ISC")).toBe("S");
    expect(beckerUnitPrefixForSection("TCP")).toBe("T");
  });

  it("infers FAR unit and module labels from Becker-style references", () => {
    expect(inferBeckerUnitLabel({ section: "FAR", chapterRef: "F-3, M-2 - Page 10" })).toBe("F3");
    expect(inferBeckerModuleNumber("F3 M2 current expected credit losses")).toBe(2);
    expect(
      inferBeckerModuleLabel({
        section: "FAR",
        chapterRef: "F-3, M-2 - Page 10",
      }),
    ).toBe("F3 M2");
  });

  it("infers ISC units with the Becker S prefix", () => {
    expect(inferBeckerUnitLabel({ section: "ISC", textbookTitle: "ISC S2 textbook" })).toBe("S2");
    expect(inferBeckerModuleLabel({ section: "ISC", chapterRef: "S2 M4 - Page 80" })).toBe("S2 M4");
  });

  it("does not cross-assign a unit from the wrong section", () => {
    expect(inferBeckerUnitLabel({ section: "FAR", chapterRef: "R1 M1 - Page 3" })).toBeNull();
  });
});
