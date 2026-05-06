import { expect, test } from "@playwright/test";

test("home page renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore browser-generated resource 404s (favicon, icons) — not app errors
      if (text.includes("Failed to load resource")) return;
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sidebar keyboard shortcuts navigate immediately", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("u");
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Textbook Study");

  await page.keyboard.press("g");
  await page.keyboard.press("y");
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Topics");
});
