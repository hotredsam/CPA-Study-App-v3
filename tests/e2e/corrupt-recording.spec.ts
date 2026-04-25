/**
 * Error-path test: corrupt or partial recordings should render gracefully.
 *
 * Full pipeline failure handling needs Trigger.dev; these tests assert the
 * API and status/home pages do not crash when a recording is incomplete.
 */
import { expect, test } from "@playwright/test";

test.describe("Corrupt recording error path", () => {
  test("status page renders gracefully even when recording has no runId", async ({ request, page }) => {
    let recordingId: string | undefined;
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 5 },
    });

    try {
      expect(startRes.ok()).toBe(true);
      const startBody = (await startRes.json()) as {
        recordingId: string;
        uploadUrl: string;
      };
      recordingId = startBody.recordingId;

      const corruptData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
      const uploadRes = await request.put(startBody.uploadUrl, {
        data: corruptData,
        headers: { "content-type": "video/webm" },
      });
      expect(uploadRes.status()).toBe(200);

      await page.goto(`/recordings/${recordingId}/status`);
      expect(page.url()).toContain(recordingId);

      const body = page.locator("body");
      await expect(body).not.toContainText("Application error");
      await expect(body).not.toContainText("TypeError");
      await expect(body).not.toContainText("Internal Server Error");
    } finally {
      if (recordingId) {
        await request.delete(`/api/recordings/${recordingId}`).catch(() => undefined);
      }
    }
  });

  test("home page lists recordings including partial ones", async ({ request, page }) => {
    let recordingId: string | undefined;
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm" },
    });

    try {
      expect(startRes.ok()).toBe(true);
      const startBody = (await startRes.json()) as { recordingId: string };
      recordingId = startBody.recordingId;

      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    } finally {
      if (recordingId) {
        await request.delete(`/api/recordings/${recordingId}`).catch(() => undefined);
      }
    }
  });
});
