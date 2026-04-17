"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "recording" | "uploading" | "uploaded" | "error";

type DeviceInfo = { deviceId: string; label: string };

export default function RecordClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizeRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devs) =>
        setMics(
          devs
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "mic" }))
        )
      )
      .catch(() => undefined);
  }, []);

  const stopTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    setUploadPct(0);
    setElapsedSec(0);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      const audio = await navigator.mediaDevices.getUserMedia({
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      });
      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...audio.getAudioTracks(),
      ]);
      mediaStreamRef.current = combined;
      if (previewRef.current) {
        previewRef.current.srcObject = combined;
        await previewRef.current.play().catch(() => undefined);
      }
      const recorder = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9,opus" });
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        void finalizeRef.current();
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setPhase("recording");
      const startedAt = Date.now();
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);

      display.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
      stopTracks();
    }
  }, [selectedMic, stopTracks]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const finalize = useCallback(async (): Promise<void> => {
    stopTracks();
    setPhase("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const durationSec = elapsedSec > 0 ? elapsedSec : undefined;
      const startRes = await fetch("/api/recordings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ durationSec, contentType: "video/webm" }),
      });
      if (!startRes.ok) throw new Error(`start failed: ${startRes.status}`);
      const { recordingId: newId, uploadUrl } = (await startRes.json()) as {
        recordingId: string;
        uploadUrl: string;
      };
      setRecordingId(newId);
      await uploadWithProgress(uploadUrl, blob, setUploadPct);
      const completeRes = await fetch(`/api/recordings/${newId}/complete`, { method: "POST" });
      if (!completeRes.ok) throw new Error(`complete failed: ${completeRes.status}`);
      setPhase("uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }, [elapsedSec, stopTracks]);

  useEffect(() => {
    finalizeRef.current = finalize;
  }, [finalize]);

  const elapsedLabel = useMemo(() => {
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [elapsedSec]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Microphone</label>
        <select
          value={selectedMic}
          onChange={(ev) => setSelectedMic(ev.target.value)}
          className="w-full rounded border border-slate-300 bg-white p-2"
          disabled={phase === "recording" || phase === "uploading"}
        >
          <option value="">Default</option>
          {mics.map((m) => (
            <option key={m.deviceId} value={m.deviceId}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <video
        ref={previewRef}
        muted
        playsInline
        className="aspect-video w-full rounded border border-slate-200 bg-black"
      />

      <div className="flex items-center gap-3">
        {phase === "idle" || phase === "error" || phase === "uploaded" ? (
          <button
            type="button"
            onClick={start}
            className="rounded bg-brand-500 px-4 py-2 text-white hover:bg-brand-700"
          >
            Start recording
          </button>
        ) : null}
        {phase === "recording" ? (
          <button
            type="button"
            onClick={stop}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Stop ({elapsedLabel})
          </button>
        ) : null}
        {phase === "uploading" ? (
          <div className="w-full">
            <div className="mb-1 text-sm text-slate-600">Uploading {uploadPct}%</div>
            <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        ) : null}
        {phase === "uploaded" && recordingId ? (
          <a
            href={`/recordings/${recordingId}/status`}
            className="rounded bg-brand-500 px-4 py-2 text-white hover:bg-brand-700"
          >
            See pipeline status →
          </a>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}
    </div>
  );
}

function uploadWithProgress(
  url: string,
  blob: Blob,
  onPct: (pct: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", blob.type || "video/webm");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onPct(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onPct(100);
        resolve();
      } else {
        reject(new Error(`upload status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(blob);
  });
}
