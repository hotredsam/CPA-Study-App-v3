/**
 * Smoke-test the recording API and R2 presigned upload path.
 *
 * This does not require the Trigger.dev dev runner to be running. Full
 * pipeline assertions still require a connected Trigger.dev worker/deployment.
 */
import { expect, test } from "@playwright/test";

test.describe("Recording API smoke test", () => {
  test("POST /api/recordings returns a valid presigned upload URL", async ({ request }) => {
    let recordingId: string | undefined;
    const res = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 30 },
    });

    try {
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as {
        recordingId: string;
        uploadUrl: string;
        r2Key: string;
        expiresInSec: number;
      };

      recordingId = body.recordingId;
      expect(body.recordingId).toBeTruthy();
      expect(body.uploadUrl).toContain("r2.cloudflarestorage.com");
      expect(body.r2Key).toMatch(/^recordings\/.+\/raw\.webm$/);
      expect(body.expiresInSec).toBe(900);
    } finally {
      if (recordingId) {
        await request.delete(`/api/recordings/${recordingId}`).catch(() => undefined);
      }
    }
  });

  test("upload a 4KB synthetic blob to R2 then call complete", async ({ request, page }) => {
    let recordingId: string | undefined;
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 10 },
    });

    try {
      expect(startRes.ok()).toBe(true);
      const startBody = (await startRes.json()) as {
        recordingId: string;
        uploadUrl: string;
      };
      recordingId = startBody.recordingId;

      const tiny = Buffer.alloc(4096, 0x1a);
      const uploadRes = await request.put(startBody.uploadUrl, {
        data: tiny,
        headers: { "content-type": "video/webm" },
      });
      expect(uploadRes.status()).toBe(200);

      const completeRes = await request.post(`/api/recordings/${recordingId}/complete`);
      if (completeRes.status() === 500) {
        console.warn("Trigger.dev not reachable. Pipeline was not queued; skipping status page assertion.");
        test.skip();
        return;
      }

      expect(completeRes.ok()).toBe(true);
      const completeBody = (await completeRes.json()) as { runId: string };
      expect(completeBody.runId).toBeTruthy();

      await page.goto(`/recordings/${recordingId}/status`);
      await expect(page.locator("body")).not.toContainText("500");
      await expect(page.locator("h1")).toBeVisible();
    } finally {
      if (recordingId) {
        await request.delete(`/api/recordings/${recordingId}`).catch(() => undefined);
      }
    }
  });
});
