"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { Bar } from "@/components/ui/Bar";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { DEFAULT_EXAM_SECTIONS_SETTINGS, useExamSections } from "@/hooks/useExamSections";
import type { CpaSectionCode } from "@/lib/cpa-sections";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "setup" | "recording" | "uploading" | "uploaded";

type DeviceInfo = { deviceId: string; label: string };

type HealthStatus = "ok" | "fail" | "unconfigured" | "loading";

type HealthData = {
  db: HealthStatus;
  r2: HealthStatus;
  trigger: HealthStatus;
};

type Check = {
  label: string;
  status: "ok" | "warn" | "fail" | "loading";
};

type CpaSection = CpaSectionCode;

type ScreenSource = "full-screen" | "window" | "browser-tab";

type RecordingOptions = {
  micId: string;
  sections: CpaSection[];
  model: string;
  screenSource: ScreenSource;
};

const SCREEN_SOURCES: { id: ScreenSource; label: string; detail: string }[] = [
  { id: "full-screen", label: "Entire screen", detail: "Best for full Becker/Ninja sessions." },
  { id: "window", label: "Application window", detail: "Use when only the question bank should be captured." },
  { id: "browser-tab", label: "Browser tab", detail: "Use for a single browser-based practice set." },
];

const GRADING_MODELS = [
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "openai/gpt-5", label: "GPT-5" },
] as const;

// ─── Upload-with-progress helper ─────────────────────────────────────────────

function uploadWithProgress(
  url: string,
  blob: Blob,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", blob.type || "video/webm");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(ev.loaded, ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(blob.size, blob.size);
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(blob);
  });
}

// ─── Setup phase ─────────────────────────────────────────────────────────────

function SetupPhase({
  onStart,
}: {
  onStart: (opts: RecordingOptions) => void;
}) {
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [screenSource, setScreenSource] = useState<ScreenSource>("full-screen");
  const [micPermDenied, setMicPermDenied] = useState(false);
  const [selectedSections, setSelectedSections] = useState<CpaSection[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-sonnet-4.6");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState<boolean | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const { data: examSettings } = useExamSections();
  const sectionOptions = examSettings?.sections ?? DEFAULT_EXAM_SECTIONS_SETTINGS.sections;

  // Mic level visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Enumerate microphones
  useEffect(() => {
    if (typeof window === "undefined") return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Release immediately — we just needed permission
        stream.getTracks().forEach((t) => t.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((devs) => {
        setMics(
          devs
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone" })),
        );
      })
      .catch(() => setMicPermDenied(true));
  }, []);

  // Start mic preview for level meter
  useEffect(() => {
    if (typeof window === "undefined") return;
    let ctx: AudioContext | null = null;

    const startMicPreview = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        micStreamRef.current = stream;
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
        drawMicLevel();
      } catch {
        // Silently ignore — visualizer is optional
      }
    };

    const drawMicLevel = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        const W = canvas.width;
        const H = canvas.height;
        ctx2d.clearRect(0, 0, W, H);

        const barCount = 10;
        const barW = Math.floor(W / barCount) - 2;
        for (let i = 0; i < barCount; i++) {
          const val = data[Math.floor((i / barCount) * data.length)] ?? 0;
          const pct = val / 255;
          const barH = Math.max(2, Math.round(pct * H));
          const hue = 120 - pct * 80; // green → yellow → red
          ctx2d.fillStyle = `oklch(0.6 0.15 ${hue})`;
          ctx2d.fillRect(i * (barW + 2), H - barH, barW, barH);
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    };

    void startMicPreview();

    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      analyserRef.current = null;
      ctx?.close().catch(() => undefined);
    };
  }, [selectedMic]);

  // Fetch health + openrouter key
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHealthLoading(true);
    Promise.all([
      fetch("/api/health").then((r) => r.json()) as Promise<HealthData>,
      fetch("/api/settings/openrouter-key")
        .then((r) => r.json())
        .then((d: { hasKey: boolean }) => d.hasKey)
        .catch(() => false),
    ])
      .then(([h, hasKey]) => {
        setHealth(h);
        setHasOpenRouterKey(hasKey);
      })
      .catch(() => {
        setHealth({ db: "fail", r2: "fail", trigger: "fail" });
        setHasOpenRouterKey(false);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  const toggleSection = (s: CpaSection) => {
    setSelectedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const checks: Check[] = [
    {
      label: "Display captured",
      status: screenSource ? "ok" : "warn",
    },
    {
      label: "Mic signal",
      status: micPermDenied ? "fail" : selectedMic || mics.length > 0 ? "ok" : "warn",
    },
    {
      label: "OpenRouter API",
      status: hasOpenRouterKey === null ? "loading" : hasOpenRouterKey ? "ok" : "warn",
    },
    {
      label: "R2 storage",
      status: healthLoading
        ? "loading"
        : health?.r2 === "ok"
        ? "ok"
        : health?.r2 === "unconfigured"
        ? "warn"
        : "fail",
    },
    {
      label: "Workers pipeline",
      status: healthLoading
        ? "loading"
        : health?.trigger === "ok"
        ? "ok"
        : "warn",
    },
    {
      label: "Textbook sources",
      status: "ok",
    },
    {
      label: "Sections assigned",
      status: selectedSections.length > 0 ? "ok" : "warn",
    },
    {
      label: "Budget OK",
      status: healthLoading ? "loading" : health ? "ok" : "fail",
    },
  ];

  const canStart =
    !micPermDenied && Boolean(screenSource) && selectedSections.length > 0 && health !== null;

  const selectedMicLabel =
    mics.find((m) => m.deviceId === selectedMic)?.label ?? "Default";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: controls */}
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-[color:var(--ink)]">Recording Setup</h2>

          {/* Screen capture */}
          <div className="space-y-2 mb-4">
            <p className="block text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
              Screen Capture
            </p>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Choose screen capture source"
            >
              {SCREEN_SOURCES.map((source) => {
                const active = screenSource === source.id;
                return (
                  <button
                    key={source.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setScreenSource(source.id)}
                    className={[
                      "rounded border px-3 py-2 text-left hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]",
                      active
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-faint)]"
                        : "border-[color:var(--border)] bg-[color:var(--surface)]",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-medium text-[color:var(--ink)]">
                      {source.label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-[color:var(--ink-faint)]">
                      {source.detail}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[color:var(--ink-faint)]">
              Your browser will ask you to confirm the exact screen, window, or tab when recording starts.
            </p>
          </div>

          {/* Microphone */}
          <div className="space-y-2 mb-4">
            <label
              htmlFor="mic-select"
              className="block text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]"
            >
              Microphone
            </label>
            {micPermDenied ? (
              <p className="text-sm text-[color:var(--bad)]">
                Microphone permission denied. Allow access in your browser settings.
              </p>
            ) : (
              <select
                id="mic-select"
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline focus:outline-2 focus:outline-[color:var(--accent)]"
                aria-label="Select microphone"
              >
                <option value="">Default microphone</option>
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            {/* Level visualizer */}
            <div aria-hidden="true">
              <canvas
                ref={canvasRef}
                width={200}
                height={32}
                className="w-full rounded bg-[color:var(--surface-2)] border border-[color:var(--border)]"
                style={{ height: 32 }}
              />
            </div>
          </div>

          {/* Section allocation */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
              CPA Sections
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Select CPA sections for this recording"
            >
              {sectionOptions.map((s) => {
                const active = selectedSections.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSection(s)}
                    aria-pressed={active}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold font-mono uppercase tracking-wide transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]",
                      active
                        ? "ring-2 ring-[color:var(--accent)] ring-offset-1"
                        : "opacity-60 hover:opacity-100",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <SectionBadge section={s} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grading model */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
              Grading Model
            </p>
            <div
              className="space-y-1"
              role="radiogroup"
              aria-label="Select grading model"
            >
              {GRADING_MODELS.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-[color:var(--border)] px-3 py-2 text-sm hover:border-[color:var(--accent)] transition-colors"
                >
                  <input
                    type="radio"
                    name="grading-model"
                    value={m.id}
                    checked={selectedModel === m.id}
                    onChange={() => setSelectedModel(m.id)}
                    className="accent-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                    aria-label={m.label}
                  />
                  <span className="text-[color:var(--ink)]">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: preflight checks */}
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-[color:var(--ink)]">Preflight Checks</h2>
          <ul className="space-y-2" aria-label="Preflight check results">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 text-sm">
                <CheckIndicator status={c.status} />
                <span className="text-[color:var(--ink-dim)]">{c.label}</span>
              </li>
            ))}
          </ul>

          {/* Session summary */}
          <div className="mt-5 rounded bg-[color:var(--surface-2)] border border-[color:var(--border)] p-3 space-y-1 text-xs text-[color:var(--ink-faint)]">
            <p>
              <span className="font-medium">Screen:</span>{" "}
              {SCREEN_SOURCES.find((s) => s.id === screenSource)?.label ?? "Not selected"}
            </p>
            <p>
              <span className="font-medium">Mic:</span> {selectedMicLabel}
            </p>
            <p>
              <span className="font-medium">Sections:</span>{" "}
              {selectedSections.length > 0 ? selectedSections.join(", ") : "None selected"}
            </p>
            <p>
              <span className="font-medium">Model:</span> {selectedModel}
            </p>
          </div>

          <div className="mt-4">
            <Btn
              variant="primary"
              size="lg"
              disabled={!canStart}
              onClick={() =>
                onStart({
                  micId: selectedMic,
                  sections: selectedSections,
                  model: selectedModel,
                  screenSource,
                })
              }
              aria-label="Start recording"
            >
              Start Screen Recording
            </Btn>
            {!canStart && selectedSections.length === 0 && (
              <p className="mt-2 text-xs text-[color:var(--ink-faint)]">
                Select at least one CPA section to start.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CheckIndicator({ status }: { status: Check["status"] }) {
  if (status === "loading") {
    return (
      <span
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent"
        aria-label="Checking..."
      />
    );
  }
  const map: Record<Check["status"], { color: string; symbol: string; label: string }> = {
    ok: { color: "text-[color:var(--good)]", symbol: "●", label: "OK" },
    warn: { color: "text-[color:var(--warn)]", symbol: "●", label: "Warning" },
    fail: { color: "text-[color:var(--bad)]", symbol: "●", label: "Failed" },
    loading: { color: "text-[color:var(--ink-faint)]", symbol: "○", label: "Checking" },
  };
  const { color, symbol, label } = map[status];
  return (
    <span className={`shrink-0 text-xs ${color}`} aria-label={label}>
      {symbol}
    </span>
  );
}

// ─── Recording phase ──────────────────────────────────────────────────────────

function RecordingPhase({
  micStream,
  elapsedSec,
  paused,
  onPauseResume,
  onMarkMoment,
  onStop,
  screenSourceName,
}: {
  micStream: MediaStream | null;
  elapsedSec: number;
  paused: boolean;
  onPauseResume: () => void;
  onMarkMoment: () => void;
  onStop: () => void;
  screenSourceName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const [momentFlash, setMomentFlash] = useState(false);

  useEffect(() => {
    if (!micStream || typeof window === "undefined") return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(micStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx2d = canvas?.getContext("2d");
      if (!canvas || !ctx2d || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(data);
      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      const barCount = 60;
      const barW = Math.floor((W - barCount * 2) / barCount);
      for (let i = 0; i < barCount; i++) {
        const val = data[Math.floor((i / barCount) * data.length)] ?? 0;
        const pct = val / 255;
        const barH = Math.max(3, Math.round(pct * H));
        ctx2d.fillStyle = `oklch(${0.5 + pct * 0.3} 0.18 ${140 - pct * 100})`;
        ctx2d.fillRect(i * (barW + 2), H - barH, barW, barH);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      analyserRef.current = null;
      ctx.close().catch(() => undefined);
    };
  }, [micStream]);

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === " ") {
        e.preventDefault();
        onPauseResume();
      }
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        onMarkMoment();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        onStop();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPauseResume, onMarkMoment, onStop]);

  const handleMarkMoment = () => {
    onMarkMoment();
    setMomentFlash(true);
    setTimeout(() => setMomentFlash(false), 600);
  };

  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const elapsedLabel = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 transition-colors ${
        momentFlash
          ? "bg-[color:var(--accent)]/20"
          : "bg-[color:var(--canvas)] bg-opacity-95"
      }`}
      style={{ backdropFilter: "blur(2px)" }}
      role="region"
      aria-label="Recording in progress"
    >
      {/* Timer */}
      <div
        className="font-mono text-5xl font-bold tabular-nums text-[color:var(--ink)]"
        aria-live="off"
        aria-label={`Elapsed time: ${elapsedLabel}`}
      >
        {elapsedLabel}
      </div>

      {paused && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-[color:var(--warn)] font-semibold uppercase tracking-widest"
        >
          Paused
        </div>
      )}

      {/* Waveform */}
      <div aria-hidden="true" className="w-full max-w-2xl px-4">
        <canvas
          ref={canvasRef}
          width={640}
          height={80}
          className="w-full rounded bg-[color:var(--surface)] border border-[color:var(--border)]"
          style={{ height: 80 }}
        />
      </div>

      {/* Source label */}
      <p className="text-xs text-[color:var(--ink-faint)] uppercase tracking-widest">
        Recording: {screenSourceName || "Screen"}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Btn
          variant="ghost"
          size="lg"
          onClick={onPauseResume}
          aria-label={paused ? "Resume recording (Ctrl+Space)" : "Pause recording (Ctrl+Space)"}
          title="Ctrl+Space"
        >
          {paused ? "Resume" : "Pause"}
        </Btn>

        <Btn
          variant="subtle"
          size="lg"
          onClick={handleMarkMoment}
          aria-label="Mark moment (Ctrl+M)"
          title="Ctrl+M"
        >
          Mark Moment
        </Btn>

        <Btn
          variant="danger"
          size="lg"
          onClick={onStop}
          aria-label="Stop and upload (Ctrl+S)"
          title="Ctrl+S"
        >
          Stop &amp; Upload
        </Btn>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-[color:var(--ink-faint)]">
        Ctrl+Space pause · Ctrl+M mark · Ctrl+S stop
      </p>
    </div>
  );
}

// ─── Upload phase ─────────────────────────────────────────────────────────────

function UploadPhase({
  uploadedBytes,
  totalBytes,
  speedBps,
  etaSec,
  done,
  recordingId,
}: {
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSec: number;
  done: boolean;
  recordingId: string | null;
}) {
  const pct = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
  const mbUploaded = (uploadedBytes / 1024 / 1024).toFixed(1);
  const mbTotal = (totalBytes / 1024 / 1024).toFixed(1);
  const kbps = (speedBps / 1024).toFixed(0);
  const etaLabel = etaSec < 60 ? `${Math.round(etaSec)}s` : `${Math.round(etaSec / 60)}m`;

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <Card className="w-full max-w-md p-8 flex flex-col gap-4 items-center text-center">
        {done ? (
          <>
            <div className="text-4xl" aria-hidden="true">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-[color:var(--good)]">Recording uploaded!</h2>
            {recordingId && (
              <a
                href="/pipeline"
                className="inline-flex items-center justify-center font-medium rounded-[3px] text-sm px-3.5 py-2 bg-[color:var(--accent)] text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              >
                View pipeline status
              </a>
            )}
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-[color:var(--ink)]">
              Uploading recording...
            </h2>
            <div className="w-full">
              <Bar
                pct={pct}
                aria-label={`Upload progress: ${pct}%`}
              />
            </div>
            <p className="text-sm text-[color:var(--ink-dim)]" aria-live="polite">
              {mbUploaded} MB of {mbTotal} MB &middot; {kbps} KB/s &middot; ETA {etaLabel}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Main RecordClient ────────────────────────────────────────────────────────

export function RecordClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [screenSourceName, setScreenSourceName] = useState("");

  // Upload tracking
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speedBps, setSpeedBps] = useState(0);
  const [etaSec, setEtaSec] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const elapsedSecRef = useRef(0);
  const uploadStartRef = useRef<number>(0);
  const currentOptionsRef = useRef<RecordingOptions | null>(null);
  // Ref so handleStart doesn't need finalizeUpload in its dependency array
  const finalizeRef = useRef<() => Promise<void>>(async () => {});

  const stopAllTracks = useCallback(() => {
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    micStreamRef.current = null;
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(
    async (opts: RecordingOptions) => {
      setError(null);
      currentOptionsRef.current = opts;
      chunksRef.current = [];
      setElapsedSec(0);
      elapsedSecRef.current = 0;

      try {
        // Capture display
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: false,
        });
        displayStreamRef.current = displayStream;

        // Try to get the track label as screen source name
        const videoTrack = displayStream.getVideoTracks()[0];
        setScreenSourceName(videoTrack?.label ?? "Screen");

        // Capture mic
        const micConstraints: MediaStreamConstraints = {
          audio: opts.micId ? { deviceId: { exact: opts.micId } } : true,
        };
        const audioStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        micStreamRef.current = audioStream;
        setMicStream(audioStream);

        // Combined stream for recording
        const combined = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);

        // Pick supported mime type
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";

        const recorder = new MediaRecorder(combined, { mimeType });
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.onstop = () => {
          void finalizeRef.current();
        };
        recorder.start(1000);
        recorderRef.current = recorder;

        // Screen share ended by user via browser UI
        videoTrack?.addEventListener("ended", () => {
          if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
          }
        });

        setPhase("recording");
        const startedAt = Date.now();
        elapsedTimerRef.current = setInterval(() => {
          if (!pausedRef.current) {
            const sec = Math.floor((Date.now() - startedAt) / 1000);
            elapsedSecRef.current = sec;
            setElapsedSec(sec);
          }
        }, 500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        stopAllTracks();
      }
    },
    [stopAllTracks],
  );

  const handlePauseResume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      pausedRef.current = true;
      setPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      pausedRef.current = false;
      setPaused(false);
    }
  }, []);

  const handleMarkMoment = useCallback(() => {
    // Log marked timestamp for debugging — uses console.warn so lint doesn't strip it
    console.warn("[Mark moment]", new Date().toISOString(), `t=${elapsedSecRef.current}s`);
  }, []);

  const handleStop = useCallback(() => {
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    stopAllTracks();
  }, [stopAllTracks]);

  const finalizeUpload = useCallback(
    async () => {
      stopAllTracks();
      setPhase("uploading");
      setUploadDone(false);
      setUploadedBytes(0);

      try {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setTotalBytes(blob.size);
        uploadStartRef.current = Date.now();

        // Create recording DB row + get presigned URL
        const startRes = await fetch("/api/recordings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            durationSec: elapsedSecRef.current > 0 ? elapsedSecRef.current : undefined,
            contentType: "video/webm",
            sections: currentOptionsRef.current?.sections ?? [],
            modelUsed: currentOptionsRef.current?.model,
            title:
              currentOptionsRef.current?.sections.length
                ? `${currentOptionsRef.current.sections.join("+")} screen recording`
                : "Screen recording",
          }),
        });
        if (!startRes.ok) throw new Error(`Failed to create recording: HTTP ${startRes.status}`);
        const { recordingId: newId, uploadUrl } = (await startRes.json()) as {
          recordingId: string;
          uploadUrl: string;
        };
        setRecordingId(newId);

        let lastLoaded = 0;
        let lastTime = Date.now();

        await uploadWithProgress(uploadUrl, blob, (loaded, total) => {
          setUploadedBytes(loaded);
          setTotalBytes(total);

          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          if (dt > 0.5) {
            const bytesPerSec = (loaded - lastLoaded) / dt;
            setSpeedBps(Math.round(bytesPerSec));
            const remaining = total - loaded;
            setEtaSec(bytesPerSec > 0 ? remaining / bytesPerSec : 0);
            lastLoaded = loaded;
            lastTime = now;
          }
        });

        // Mark as complete + trigger pipeline
        const completeRes = await fetch(`/api/recordings/${newId}/complete`, {
          method: "POST",
        });
        if (!completeRes.ok) throw new Error(`Failed to complete recording: HTTP ${completeRes.status}`);

        setUploadDone(true);

        // Fire toast
        window.dispatchEvent(
          new CustomEvent("servant:toast", {
            detail: { message: "Recording uploaded!", variant: "success" },
          }),
        );

        // Redirect after short delay
        setTimeout(() => router.push("/pipeline"), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setPhase("setup");
      }
    },
    [stopAllTracks, router],
  );

  // Keep finalizeRef pointing at the latest version
  useEffect(() => {
    finalizeRef.current = finalizeUpload;
  }, [finalizeUpload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [stopAllTracks]);

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-[color:var(--bad)] bg-[color:var(--bad)]/10 px-4 py-3 text-sm text-[color:var(--bad)]"
        >
          <strong>Error:</strong> {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 underline underline-offset-2 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--bad)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {phase === "setup" && (
        <SetupPhase
          onStart={(opts) => {
            void handleStart(opts);
          }}
        />
      )}

      {phase === "recording" && (
        <RecordingPhase
          micStream={micStream}
          elapsedSec={elapsedSec}
          paused={paused}
          onPauseResume={handlePauseResume}
          onMarkMoment={handleMarkMoment}
          onStop={handleStop}
          screenSourceName={screenSourceName}
        />
      )}

      {phase === "uploading" && (
        <UploadPhase
          uploadedBytes={uploadedBytes}
          totalBytes={totalBytes}
          speedBps={speedBps}
          etaSec={etaSec}
          done={uploadDone}
          recordingId={recordingId}
        />
      )}
    </div>
  );
}
