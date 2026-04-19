import { expect, test } from "@playwright/test";

test("record page: heading says Record a Session", async ({ page }) => {
  await page.goto("/record");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Record a Session");
});
