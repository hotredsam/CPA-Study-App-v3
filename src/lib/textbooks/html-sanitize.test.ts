import { describe, expect, it } from "vitest";
import { sanitizeChunkHtml } from "./html-sanitize";

describe("sanitizeChunkHtml", () => {
  it("removes scriptable HTML and unsafe URL attributes", () => {
    const html = sanitizeChunkHtml(`
      <div onclick="alert(1)">Safe text</div>
      <script>alert(1)</script>
      <svg><script>alert(2)</script></svg>
      <a href="javascript:alert(3)">bad link</a>
      <img src="https://example.com/x.png" onerror="alert(4)" />
      <table><tr><th scope="col">Rule</th><td colspan="2">Allowed</td></tr></table>
    `);

    expect(html).toContain("Safe text");
    expect(html).toContain("<table>");
    expect(html).toContain("colspan=\"2\"");
    expect(html).not.toMatch(/script|onclick|javascript:|onerror|<img|<svg/i);
  });
});
