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

test("command palette searches and navigates", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();

  await page.getByRole("combobox", { name: "Search destinations" }).fill("library");
  await expect(palette.getByRole("option", { name: /Library/i })).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Textbooks");
});

test("command palette supports keyboard selection and escape", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/record$/);

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
});
