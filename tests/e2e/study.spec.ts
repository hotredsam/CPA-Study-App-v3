import { expect, test } from "@playwright/test";

test("study home: heading says Textbook Study", async ({ page }) => {
  await page.goto("/study");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Textbook Study");
});
