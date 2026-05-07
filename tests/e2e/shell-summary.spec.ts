import { expect, test } from "@playwright/test";

test("shell chrome uses one lightweight summary request for sidebar badges", async ({ page }) => {
  const apiPaths: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      apiPaths.push(`${url.pathname}${url.search}`);
    }
  });

  const summaryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/shell/summary";
  });

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect((await summaryResponse).status()).toBeLessThan(500);

  expect(apiPaths).toContain("/api/shell/summary");
  expect(apiPaths.some((path) => path.startsWith("/api/settings/study-hours"))).toBe(false);
  expect(apiPaths.some((path) => path.startsWith("/api/anki/due"))).toBe(false);
  expect(apiPaths.some((path) => path.startsWith("/api/recordings?status="))).toBe(false);
});
