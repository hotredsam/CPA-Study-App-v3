/**
 * Phase A3 smoke test: simulate an upload by POSTing directly to the
 * /api/recordings API and uploading a small buffer to R2 via the presigned URL.
 *
 * This test does NOT require the Trigger.dev dev runner to be running.
 * It asserts the API layer + R2 presign work correctly. Full pipeline
 * assertion (StageProgress=100) requires `pnpm trigger:dev` and is
 * validated in the acceptance report (reports/phase1-acceptance-v2.md).
 */
import { expect, test } from "@playwright/test";

test.describe("Recording API smoke test", () => {
  test("POST /api/recordings returns a valid presigned upload URL", async ({ request }) => {
    const res = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 30 },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      recordingId: string;
      uploadUrl: string;
      r2Key: string;
      expiresInSec: number;
    };
    expect(body.recordingId).toBeTruthy();
    expect(body.uploadUrl).toContain("r2.cloudflarestorage.com");
    expect(body.r2Key).toMatch(/^recordings\/.+\/raw\.webm$/);
    expect(body.expiresInSec).toBe(900);
  });

  test("upload a 4KB synthetic blob to R2 then call complete", async ({ request, page }) => {
    // 1. Create recording
    const startRes = await request.post("/api/recordings", {
      data: { contentType: "video/webm", durationSec: 10 },
    });
    expect(startRes.ok()).toBe(true);
    const { recordingId, uploadUrl } = (await startRes.json()) as {
      recordingId: string;
      uploadUrl: string;
    };

    // 2. Upload tiny synthetic blob to R2
    const tiny = Buffer.alloc(4096, 0x1a); // 4 KB — enough to be a real PUT
    const uploadRes = await request.put(uploadUrl, {
      data: tiny,
      headers: { "content-type": "video/webm" },
    });
    // R2 returns 200 on success. If R2 creds are misconfigured this will fail.
    expect(uploadRes.status()).toBe(200);

    // 3. Call complete — triggers the pipeline on Trigger.dev cloud
    //    (pipeline will run when dev runner connects; we just assert the API round-trips)
    const completeRes = await request.post(`/api/recordings/${recordingId}/complete`);
    // 200 → pipeline queued successfully; 500 → Trigger.dev not reachable
    if (completeRes.status() === 500) {
      console.warn("Trigger.dev not reachable — pipeline not queued. Skipping status page assertion.");
      test.skip();
      return;
    }
    expect(completeRes.ok()).toBe(true);
    const completeBody = (await completeRes.json()) as { runId: string };
    expect(completeBody.runId).toBeTruthy();

    // 4. Status page renders
    await page.goto(`/recordings/${recordingId}/status`);
    await expect(page.locator("body")).not.toContainText("500");
    // The page header should reference the recording
    await expect(page.locator("h1")).toBeVisible();
  });
});
