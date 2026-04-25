import { expect, test } from "@playwright/test";

test("record page: heading says Preflight", async ({ page }) => {
  await page.goto("/record");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Preflight");
  await expect(page.getByText("Screen Capture")).toBeVisible();
});
