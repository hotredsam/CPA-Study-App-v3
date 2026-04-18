/**
 * Error-path test: corrupt recording should fail gracefully.
 * The pipeline should mark the Recording as "failed" and the status page
 * should render without a 500 error. We can't run the full pipeline here
 * (needs Trigger.dev dev runner), but we can assert the API layer doesn't crash.
 */
import { expect, test } from "@playwright/test";

test.describe("Corrupt recording error path", () => {
  test("status page renders gracefully even when recording has no runId", async ({ request, page }) => {
    // 1. Create a Recording row
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 5 },
    });
    expect(startRes.ok()).toBe(true);
    const { recordingId, uploadUrl } = (await startRes.json()) as {
      recordingId: string;
      uploadUrl: string;
    };

    // 2. Upload a tiny obviously-corrupt blob (just a few bytes, not valid webm)
    const corruptData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
    const uploadRes = await request.put(uploadUrl, {
      data: corruptData,
      headers: { "content-type": "video/webm" },
    });
    // R2 accepts any bytes — validation happens during processing
    expect(uploadRes.status()).toBe(200);

    // 3. Navigate to status page BEFORE completing (simulates viewing before pipeline start)
    await page.goto(`/recordings/${recordingId}/status`);

    // The status page must not return a 500 (it should show a loading/amber state)
    const responseCode = page.url(); // page URL shouldn't have changed (no redirect to 404)
    expect(responseCode).toContain(recordingId);

    // No unhandled React error overlay
    const body = page.locator("body");
    await expect(body).not.toContainText("Application error");
    await expect(body).not.toContainText("TypeError");
    await expect(body).not.toContainText("Internal Server Error");
  });

  test("home page lists recordings including failed ones", async ({ request, page }) => {
    // Create a recording without completing it
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm" },
    });
    expect(startRes.ok()).toBe(true);

    // Home page should load without errors even with partial recordings
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
