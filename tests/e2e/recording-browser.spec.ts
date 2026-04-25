import { expect, test } from "@playwright/test";

test.describe("browser recording flow", () => {
  test("records a mocked screen stream, uploads it, and reaches the pipeline handoff", async ({ page }) => {
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ db: "ok", r2: "ok", trigger: "ok" }),
      });
    });

    await page.route("**/api/settings/openrouter-key", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hasKey: true, suffix: "7fc" }),
      });
    });

    await page.route("**/api/settings/exam-sections", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sections: ["FAR", "AUD", "REG", "TCP"],
          mandatory: ["FAR", "AUD", "REG"],
          discipline: "TCP",
          disciplineOptions: [{ section: "TCP", name: "Tax Compliance and Planning" }],
        }),
      });
    });

    await page.route("**/api/recordings", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          recordingId: "e2e-recording",
          uploadUrl: "http://localhost:3001/__e2e-upload",
          r2Key: "recordings/e2e-recording/raw.webm",
          expiresInSec: 900,
        }),
      });
    });

    await page.route("**/__e2e-upload", async (route) => {
      expect(route.request().method()).toBe("PUT");
      await route.fulfill({ status: 200, body: "" });
    });

    await page.route("**/api/recordings/e2e-recording/complete", async (route) => {
      expect(route.request().method()).toBe("POST");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ runId: "run_e2e_recording" }),
      });
    });

    await page.addInitScript(() => {
      const windowWithCalls = window as Window & {
        __recordingCalls?: { display: number; audio: number; enumerate: number };
        __recordingAudioContexts?: AudioContext[];
      };
      windowWithCalls.__recordingCalls = { display: 0, audio: 0, enumerate: 0 };
      windowWithCalls.__recordingAudioContexts = [];

      function makeScreenStream() {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#f8f5f0";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#b91c3a";
          ctx.fillRect(24, 24, 180, 48);
          ctx.fillStyle = "#111827";
          ctx.font = "24px sans-serif";
          ctx.fillText("CPA study capture", 32, 56);
        }
        const stream = canvas.captureStream(15);
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          Object.defineProperty(videoTrack, "label", {
            value: "Mock CPA study screen",
            configurable: true,
          });
        }
        return stream;
      }

      function makeAudioStream() {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        oscillator.frequency.value = 220;
        oscillator.connect(destination);
        oscillator.start();
        windowWithCalls.__recordingAudioContexts?.push(context);
        return destination.stream;
      }

      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getDisplayMedia: async () => {
            windowWithCalls.__recordingCalls!.display += 1;
            return makeScreenStream();
          },
          getUserMedia: async () => {
            windowWithCalls.__recordingCalls!.audio += 1;
            return makeAudioStream();
          },
          enumerateDevices: async () => {
            windowWithCalls.__recordingCalls!.enumerate += 1;
            return [
              {
                deviceId: "mock-mic",
                groupId: "mock-group",
                kind: "audioinput",
                label: "Mock microphone",
                toJSON: () => ({}),
              },
            ];
          },
        },
      });
    });

    await page.goto("/record");

    await page.getByRole("button", { name: "FAR" }).click();
    await expect(page.getByRole("button", { name: /start recording/i })).toBeEnabled();

    await page.getByRole("button", { name: /start recording/i }).click();
    await expect(page.getByRole("region", { name: /recording in progress/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Recording: Mock CPA study screen/i)).toBeVisible();

    await page.getByRole("button", { name: /stop and upload/i }).click();
    await expect(page.getByRole("heading", { name: /recording uploaded/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /view pipeline status/i })).toBeVisible();

    const calls = await page.evaluate(() => {
      return (window as Window & {
        __recordingCalls?: { display: number; audio: number; enumerate: number };
      }).__recordingCalls;
    });

    expect(calls?.display).toBe(1);
    expect(calls?.audio ?? 0).toBeGreaterThanOrEqual(1);
    expect(calls?.enumerate ?? 0).toBeGreaterThanOrEqual(1);
  });
});
