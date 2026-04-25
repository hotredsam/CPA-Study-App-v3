"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bar } from "@/components/ui/Bar";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { normalizePercent } from "@/lib/percent";

type Textbook = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
};

type Chunk = {
  id: string;
  order: number;
  title: string | null;
  chapterRef: string | null;
  content: string;
  htmlContent: string | null;
  topicId: string | null;
  fasbCitation: string | null;
};

type Topic = {
  id: string;
  name: string;
  section: string;
  mastery: number;
} | null;

type QuizQuestion = {
  stem: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  rationale: string;
  distractorQualityNote: string;
};

type CheckpointQuizOutput = {
  questions: QuizQuestion[];
};

interface Props {
  textbook: Textbook;
  chunk: Chunk;
  topic: Topic;
  prevChunkIdx: number | null;
  nextChunkIdx: number | null;
}

type QuizState = "idle" | "loading" | "ready" | "submitted" | "error";

export function StudyReaderClient({
  textbook,
  chunk,
  topic,
  prevChunkIdx,
  nextChunkIdx,
}: Props) {
  // Session timer
  const [sessionSec, setSessionSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => setSessionSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Checkpoint quiz
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [quizData, setQuizData] = useState<CheckpointQuizOutput | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = useCallback(async () => {
    setQuizState("loading");
    setQuizError(null);
    setSubmitted(false);
    setSelectedAnswers([]);
    try {
      const res = await fetch(`/api/study/checkpoint?chunkId=${encodeURIComponent(chunk.id)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as CheckpointQuizOutput;
      setQuizData(data);
      setSelectedAnswers(new Array(data.questions.length).fill(null) as null[]);
      setQuizState("ready");
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : String(err));
      setQuizState("error");
    }
  }, [chunk.id]);

  const handleSelectAnswer = (qIdx: number, aIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = aIdx;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!quizData) return;
    setSubmitted(true);
    setQuizState("submitted");
  };

  const progressPct =
    textbook.chunkCount > 0 ? ((chunk.order + 1) / textbook.chunkCount) * 100 : 0;
  const topicMasteryPct = topic ? normalizePercent(topic.mastery) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-1">{textbook.title}</p>
          <h1 className="text-2xl font-semibold text-[color:var(--ink)] leading-tight">
            {chunk.title ?? `Section ${chunk.order + 1}`}
          </h1>
          {chunk.chapterRef && (
            <p className="mt-1 text-sm text-[color:var(--ink-faint)]">{chunk.chapterRef}</p>
          )}
        </div>
        <Link href="/study" tabIndex={-1}>
          <Btn variant="ghost" size="sm" aria-label="Back to study home">
            Back to study home
          </Btn>
        </Link>
      </div>

      {/* Progress strip */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Bar
            pct={progressPct}
            aria-label={`Reading progress: chunk ${chunk.order + 1} of ${textbook.chunkCount}`}
          />
        </div>
        <span className="shrink-0 text-xs text-[color:var(--ink-faint)] font-mono">
          {chunk.order + 1} / {textbook.chunkCount}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left: reading area */}
        <div className="space-y-6 min-w-0">
          <Card>
            {chunk.htmlContent ? (
              <article
                className="textbook-html-render max-w-none"
                style={{
                  fontFamily: "var(--font-serif, Instrument Serif, serif)",
                  lineHeight: 1.7,
                  maxWidth: "65ch",
                }}
                aria-label={`Chunk content: ${chunk.title ?? `Section ${chunk.order + 1}`}`}
                dangerouslySetInnerHTML={{ __html: chunk.htmlContent }}
              />
            ) : (
              <article
                className="prose max-w-none"
                style={{
                  fontFamily: "var(--font-serif, Instrument Serif, serif)",
                  lineHeight: 1.7,
                  maxWidth: "65ch",
                }}
                aria-label={`Chunk content: ${chunk.title ?? `Section ${chunk.order + 1}`}`}
              >
                {chunk.content.split("\n").map((para, i) =>
                  para.trim() ? (
                    <p
                      key={i}
                      className="mb-4 text-[color:var(--ink)] text-[1.0625rem] leading-[1.75]"
                    >
                      {para}
                    </p>
                  ) : null,
                )}
              </article>
            )}

            {chunk.fasbCitation && (
              <div className="mt-4 flex items-start gap-2 rounded bg-[color:var(--surface-2)] px-3 py-2 border border-[color:var(--border)]">
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--ink-faint)]">
                  FASB
                </span>
                <p className="text-sm text-[color:var(--ink-dim)]">{chunk.fasbCitation}</p>
              </div>
            )}
          </Card>

          {/* Checkpoint quiz */}
          <section aria-label="Practice questions">
            {quizState === "idle" && (
              <Btn variant="primary" onClick={generateQuiz}>
                Generate Practice Questions
              </Btn>
            )}

            {quizState === "loading" && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-sm text-[color:var(--ink-dim)]"
              >
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent"
                  aria-hidden="true"
                />
                Generating questions...
              </div>
            )}

            {quizState === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-[color:var(--bad)]">
                  Failed to generate questions: {quizError}
                </p>
                <Btn variant="ghost" size="sm" onClick={generateQuiz}>
                  Try again
                </Btn>
              </div>
            )}

            {(quizState === "ready" || quizState === "submitted") && quizData && (
              <Card>
                <h2 className="mb-4 text-sm font-semibold text-[color:var(--ink)]">
                  Practice Questions
                </h2>
                <div className="space-y-6">
                  {quizData.questions.map((q, qIdx) => {
                    const selected = selectedAnswers[qIdx] ?? null;
                    const isCorrect = submitted && selected === q.correctIndex;
                    const isWrong = submitted && selected !== null && selected !== q.correctIndex;

                    return (
                      <fieldset key={qIdx} className="space-y-2">
                        <legend className="text-sm font-medium text-[color:var(--ink)] mb-2">
                          <span className="text-[color:var(--ink-faint)] mr-1">{qIdx + 1}.</span>
                          {q.stem}
                        </legend>
                        <div className="space-y-1" role="radiogroup" aria-label={`Question ${qIdx + 1} choices`}>
                          {q.choices.map((choice, cIdx) => {
                            const isSelected = selected === cIdx;
                            const isThisCorrect = cIdx === q.correctIndex;
                            let ringClass = "border-[color:var(--border)]";
                            if (submitted && isThisCorrect) {
                              ringClass = "border-[color:var(--good)] bg-[color:var(--good)]/10";
                            } else if (submitted && isSelected && !isThisCorrect) {
                              ringClass = "border-[color:var(--bad)] bg-[color:var(--bad)]/10";
                            } else if (!submitted && isSelected) {
                              ringClass = "border-[color:var(--accent)]";
                            }

                            return (
                              <label
                                key={cIdx}
                                className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 text-sm transition-colors ${ringClass} ${
                                  submitted ? "cursor-default" : "hover:border-[color:var(--accent)]"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q${qIdx}`}
                                  value={cIdx}
                                  checked={isSelected}
                                  onChange={() => handleSelectAnswer(qIdx, cIdx)}
                                  disabled={submitted}
                                  className="mt-0.5 shrink-0 accent-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                                  aria-label={`Choice ${String.fromCharCode(65 + cIdx)}: ${choice}`}
                                />
                                <span className="text-[color:var(--ink)]">
                                  <span className="font-mono text-xs text-[color:var(--ink-faint)] mr-1">
                                    {String.fromCharCode(65 + cIdx)}.
                                  </span>
                                  {choice}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {submitted && (
                          <div
                            className={`mt-2 rounded px-3 py-2 text-sm ${
                              isCorrect
                                ? "bg-[color:var(--good)]/10 text-[color:var(--good)]"
                                : isWrong
                                ? "bg-[color:var(--bad)]/10 text-[color:var(--bad)]"
                                : "bg-[color:var(--surface-2)] text-[color:var(--ink-dim)]"
                            }`}
                            role="alert"
                          >
                            <p className="font-medium mb-1">
                              {selected === null
                                ? "Not answered"
                                : isCorrect
                                ? "Correct!"
                                : "Incorrect"}
                            </p>
                            <p className="text-[color:var(--ink-dim)]">{q.rationale}</p>
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>

                {quizState === "ready" && (
                  <div className="mt-6 flex gap-3">
                    <Btn
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={selectedAnswers.some((a) => a === null)}
                      aria-label="Submit answers"
                    >
                      Submit
                    </Btn>
                  </div>
                )}

                {quizState === "submitted" && nextChunkIdx !== null && (
                  <div className="mt-6">
                    <Link
                      href={`/study/${textbook.id}/${nextChunkIdx}`}
                      className="inline-flex items-center justify-center font-medium rounded-[3px] text-sm px-3.5 py-2 bg-[color:var(--accent)] text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                    >
                      Continue
                    </Link>
                  </div>
                )}
              </Card>
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-4" aria-label="Navigation and session info">
          {/* Navigation */}
          <Card>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
              Navigation
            </h2>
            <div className="flex gap-2 mb-4">
              {prevChunkIdx !== null ? (
                <Link
                  href={`/study/${textbook.id}/${prevChunkIdx}`}
                  className="flex-1 inline-flex items-center justify-center text-xs font-medium rounded-[3px] px-2.5 py-1.5 border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                  aria-label="Previous chunk"
                >
                  Prev
                </Link>
              ) : (
                <span className="flex-1 inline-flex items-center justify-center text-xs rounded-[3px] px-2.5 py-1.5 text-[color:var(--ink-faint)] opacity-40 border border-[color:var(--border)]">
                  Prev
                </span>
              )}
              {nextChunkIdx !== null && submitted ? (
                <Link
                  href={`/study/${textbook.id}/${nextChunkIdx}`}
                  className="flex-1 inline-flex items-center justify-center text-xs font-medium rounded-[3px] px-2.5 py-1.5 border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                  aria-label="Next chunk"
                >
                  Next
                </Link>
              ) : (
                <span className="flex-1 inline-flex items-center justify-center text-xs rounded-[3px] px-2.5 py-1.5 text-[color:var(--ink-faint)] opacity-40 border border-[color:var(--border)]">
                  {nextChunkIdx === null ? "Next" : "Complete checkpoint"}
                </span>
              )}
            </div>
            <p className="text-xs text-[color:var(--ink-faint)]">
              Chunk {chunk.order + 1} of {textbook.chunkCount}
            </p>
          </Card>

          {/* Topic link */}
          {topic && (
            <Card>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
                Topic
              </h2>
              <div className="flex items-start gap-2 justify-between">
                <div>
                  <p className="text-sm font-medium text-[color:var(--ink)]">{topic.name}</p>
                  <div className="mt-1">
                    <SectionBadge section={topic.section} size="xs" />
                  </div>
                </div>
                <Link
                  href="/topics"
                  className="shrink-0 text-xs text-[color:var(--accent)] underline underline-offset-2 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                  aria-label={`View topic: ${topic.name}`}
                >
                  View
                </Link>
              </div>
              <div className="mt-3">
                <p className="mb-1 text-xs text-[color:var(--ink-faint)]">Mastery</p>
                <Bar
                  pct={topicMasteryPct}
                  aria-label={`Topic mastery: ${topicMasteryPct}%`}
                />
              </div>
            </Card>
          )}

          {/* Session stats */}
          <Card>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
              Session
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[color:var(--ink-faint)]">Time spent</dt>
                <dd className="font-mono text-[color:var(--ink)]">{formatTime(sessionSec)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
