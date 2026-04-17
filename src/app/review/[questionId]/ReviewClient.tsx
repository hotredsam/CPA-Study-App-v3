"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { Feedback } from "@prisma/client";

type QuestionView = {
  id: string;
  status: string;
  section: string | null;
  transcript: unknown;
  extracted: unknown;
  noAudio: boolean;
  clipUrl: string | null;
};

type Props = {
  question: QuestionView;
  feedback: Feedback | null;
  prevId: string | null;
  nextId: string | null;
};

type TranscriptSegment = {
  start?: number;
  end?: number;
  text?: string;
  words?: Array<{ start?: number; end?: number; word?: string }>;
};

type ExtractedShape = {
  question?: string;
  choices?: string[];
  userAnswer?: string;
  correctAnswer?: string;
  beckerExplanation?: string;
  section?: string;
};

export default function ReviewClient({ question, feedback, prevId, nextId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const extracted = (question.extracted ?? null) as ExtractedShape | null;
  const transcript = (question.transcript ?? null) as { segments?: TranscriptSegment[] } | null;

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" && prevId) window.location.href = `/review/${prevId}`;
      if (ev.key === "ArrowRight" && nextId) window.location.href = `/review/${nextId}`;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevId, nextId]);

  const seekTo = useCallback((sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      void videoRef.current.play().catch(() => undefined);
    }
  }, []);

  const feedbackItems = parseFeedbackItems(feedback);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        {question.clipUrl ? (
          <video
            ref={videoRef}
            src={question.clipUrl}
            controls
            className="w-full rounded border border-slate-200 bg-black"
          />
        ) : (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Clip URL unavailable — R2 credentials not set or clip not yet uploaded.
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold">{extracted?.question ?? "(question text pending)"}</h2>
          {extracted?.choices?.length ? (
            <ol className="mt-2 list-decimal space-y-1 pl-6 text-sm">
              {extracted.choices.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="font-medium text-slate-500">Your answer</dt>
            <dd>{extracted?.userAnswer ?? "—"}</dd>
            <dt className="font-medium text-slate-500">Correct</dt>
            <dd>{extracted?.correctAnswer ?? "—"}</dd>
            <dt className="font-medium text-slate-500">Section</dt>
            <dd>{extracted?.section ?? question.section ?? "—"}</dd>
          </dl>
          {extracted?.beckerExplanation ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-600">Becker explanation</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm">{extracted.beckerExplanation}</p>
            </details>
          ) : null}
        </section>

        <section>
          <h3 className="text-lg font-semibold">Transcript</h3>
          {question.noAudio ? (
            <p className="text-sm text-slate-500">No speech detected.</p>
          ) : transcript?.segments?.length ? (
            <div className="max-h-96 overflow-y-auto rounded border border-slate-200 p-2 text-sm">
              {transcript.segments.map((s, i) => (
                <p key={i} className="mb-1">
                  {s.words?.length
                    ? s.words.map((w, j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => seekTo(w.start ?? 0)}
                          className="mr-1 inline rounded px-0.5 text-left hover:bg-brand-50"
                        >
                          {w.word}
                        </button>
                      ))
                    : (
                      <button
                        type="button"
                        onClick={() => seekTo(s.start ?? 0)}
                        className="text-left hover:underline"
                      >
                        {s.text}
                      </button>
                    )}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Transcript not ready.</p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section>
          <h3 className="text-lg font-semibold">Scores</h3>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt>Accounting</dt>
            <dd className="font-mono">{feedback?.accountingScore ?? "—"} / 10</dd>
            <dt>Consulting</dt>
            <dd className="font-mono">{feedback?.consultingScore ?? "—"} / 10</dd>
            <dt>Combined</dt>
            <dd className="font-mono">{feedback?.combinedScore ?? "—"} / 10</dd>
          </dl>
        </section>

        <section>
          <h3 className="text-lg font-semibold">Feedback</h3>
          {feedbackItems.length === 0 ? (
            <p className="text-sm text-slate-500">Feedback not ready.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {feedbackItems.map((it, i) => (
                <li key={i} className="rounded border border-slate-200 p-2">
                  <p className="font-medium">{it.key}</p>
                  <p className="text-slate-700">{it.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {feedback?.whatYouNeedToLearn ? (
          <section>
            <h3 className="text-lg font-semibold">What you need to learn</h3>
            <p className="text-sm">{feedback.whatYouNeedToLearn}</p>
          </section>
        ) : null}

        <nav className="flex items-center justify-between text-sm">
          {prevId ? (
            <Link href={`/review/${prevId}`} className="rounded border px-3 py-1 hover:bg-slate-50">
              ← Prev
            </Link>
          ) : (
            <span className="text-slate-400">Prev</span>
          )}
          {nextId ? (
            <Link href={`/review/${nextId}`} className="rounded border px-3 py-1 hover:bg-slate-50">
              Next →
            </Link>
          ) : (
            <span className="text-slate-400">Next</span>
          )}
        </nav>
      </aside>
    </div>
  );
}

function parseFeedbackItems(feedback: Feedback | null): Array<{ key: string; comment: string }> {
  if (!feedback) return [];
  const raw = feedback.items as unknown;
  if (!raw || typeof raw !== "object") return [];
  const container = raw as { items?: unknown };
  const arr = Array.isArray(container.items) ? container.items : null;
  if (!arr) return [];
  return arr
    .filter(
      (i): i is { key: string; comment: string } =>
        !!i && typeof i === "object" && typeof (i as { key?: unknown }).key === "string"
    )
    .map((i) => ({ key: i.key, comment: typeof i.comment === "string" ? i.comment : "" }));
}
