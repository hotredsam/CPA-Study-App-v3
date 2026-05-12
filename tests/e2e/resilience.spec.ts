import { expect, test } from "@playwright/test";

test("record preflight keeps start disabled when health fails", async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database is unavailable.",
        },
      }),
    });
  });
  await page.route("**/api/settings/openrouter-key", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasKey: true }),
    });
  });

  await page.goto("/record");
  await page.getByRole("button", { name: "FAR" }).click();

  await expect(page.getByRole("button", { name: /Start recording/i })).toBeDisabled();
});

test("pipeline shows retryable error state when processing status fails", async ({ page }) => {
  await page.route("**/api/recordings?status=uploaded,segmenting,processing_questions**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database is temporarily unavailable. Please retry.",
        },
      }),
    });
  });

  await page.goto("/pipeline");

  const alert = page.getByRole("alert").filter({ hasText: "Pipeline unavailable" });
  await expect(alert).toContainText("Pipeline unavailable");
  await expect(alert).toContainText("Database is temporarily unavailable");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Invalid `prisma.");
});
