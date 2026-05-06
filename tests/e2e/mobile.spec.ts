import { expect, test, type Page } from "@playwright/test";

const MOBILE_ROUTES = ["/", "/record", "/topics", "/study", "/anki", "/library", "/settings"];

test.use({
  viewport: { width: 440, height: 956 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return width - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
}

test.describe("mobile production shell", () => {
  for (const route of MOBILE_ROUTES) {
    test(`${route} fits a Pro Max class viewport`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not return a server error`).toBeLessThan(500);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expectNoDocumentOverflow(page);
    });
  }

  test("bottom navigation stays reachable on mobile", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(900);
    await nav.getByRole("link", { name: "Anki" }).tap();
    await expect(page).toHaveURL(/\/anki$/);
  });

  test("audio flashcards are reachable with touch controls", async ({ page }) => {
    await page.goto("/anki");
    await page.getByRole("tab", { name: "Audio" }).tap();
    await expect(page.getByRole("tabpanel")).toContainText(/Audio review|Audio deck|Audio review is clear/);
    await expectNoDocumentOverflow(page);
  });

  test("recording upload fallback is reachable on mobile", async ({ page }) => {
    await page.goto("/record");
    await expect(page.getByLabel("iPhone Screen Recording")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload screen recording file" })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
});
