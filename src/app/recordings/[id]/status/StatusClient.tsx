"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { StageProgress } from "@/lib/schemas/stageProgress";

type Props = {
  recordingId: string;
  runId: string | null;
  publicAccessToken: string | null;
  questions: Array<{ id: string; status: string; startSec: number; endSec: number }>;
};

export default function StatusClient({ recordingId, runId, publicAccessToken, questions }: Props) {
  if (!runId || !publicAccessToken) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Realtime stream unavailable. Either this recording has no Trigger run yet or
        <code className="mx-1">TRIGGER_SECRET_KEY</code> isn&apos;t set on the server.
        <div className="mt-2">
          Questions so far:{" "}
          <span className="font-mono">{questions.length}</span>. Refresh the page to see
          updates.
        </div>
      </div>
    );
  }

  return (
    <StatusStream
      recordingId={recordingId}
      runId={runId}
      publicAccessToken={publicAccessToken}
      questions={questions}
    />
  );
}

type StreamProps = {
  recordingId: string;
  runId: string;
  publicAccessToken: string;
  questions: Props["questions"];
};

function StatusStream({ recordingId, runId, publicAccessToken, questions }: StreamProps) {
  const { run, error } = useRealtimeRun(runId, { accessToken: publicAccessToken });

  const progress = useMemo<StageProgress | null>(() => {
    const raw = run?.metadata?.progress;
    if (!raw) return null;
    const parsed = StageProgress.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [run?.metadata?.progress]);

  if (error) {
    return <p className="text-sm text-red-700">Stream error: {error.message}</p>;
  }

  const state = run?.status ?? "PENDING";
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>
            Stage: <strong>{progress?.stage ?? state.toLowerCase()}</strong>
          </span>
          <span>{progress?.pct ?? 0}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded bg-slate-200">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${progress?.pct ?? 0}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">{progress?.message ?? "…"}</p>
        {progress?.sub ? (
          <p className="mt-1 text-xs text-slate-500">
            {progress.sub.current}/{progress.sub.total}
            {progress.sub.itemLabel ? ` — ${progress.sub.itemLabel}` : ""}
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Questions ({questions.length})</h2>
        <ul className="space-y-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between rounded border border-slate-200 p-3"
            >
              <span className="font-mono text-xs">
                {formatSec(q.startSec)} – {formatSec(q.endSec)}
              </span>
              <span className="text-xs">{q.status}</span>
              <Link
                href={`/review/${recordingId}`}
                className="text-sm text-brand-700 hover:underline"
              >
                Review →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {state === "COMPLETED" && questions[0] ? (
        <div>
          <Link
            href={`/review/${recordingId}`}
            className="rounded bg-brand-500 px-4 py-2 text-white hover:bg-brand-700"
          >
            Start review →
          </Link>
        </div>
      ) : null}

      <p className="text-xs text-slate-400">
        Recording <code>{recordingId}</code>
      </p>
    </div>
  );
}

function formatSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
