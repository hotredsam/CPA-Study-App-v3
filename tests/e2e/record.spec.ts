import { expect, test } from "@playwright/test";

test("record page: heading says Preflight", async ({ page }) => {
  await page.goto("/record");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Preflight");
  await expect(page.getByText("Screen Capture")).toBeVisible();
});

test("record page exposes an iPhone screen-recording upload fallback", async ({ page }) => {
  await page.goto("/record");
  await expect(page.getByLabel("iPhone Screen Recording")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload screen recording file" })).toBeDisabled();
});
