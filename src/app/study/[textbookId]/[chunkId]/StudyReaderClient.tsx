"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bar } from "@/components/ui/Bar";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { HydratedTextbookHtml } from "@/components/textbooks/HydratedTextbookHtml";
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

type PracticeCard = {
  id: string;
  front: string;
  back: string;
  explanation: string | null;
  sourceCitation: string | null;
  difficulty: number | null;
};

interface Props {
  textbook: Textbook;
  chunk: Chunk;
  topic: Topic;
  practiceCards: PracticeCard[];
  prevChunkIdx: number | null;
  nextChunkIdx: number | null;
}

function cardDifficultyLabel(difficulty: number | null) {
  if (difficulty === null) return null;
  if (difficulty < 0.34) return "Foundational";
  if (difficulty < 0.67) return "Applied";
  return "Advanced";
}

export function StudyReaderClient({
  textbook,
  chunk,
  topic,
  practiceCards,
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
              <HydratedTextbookHtml
                html={chunk.htmlContent}
                fallbackText={chunk.content}
                className="textbook-html-render max-w-none"
                style={{
                  fontFamily: "var(--font-serif, Instrument Serif, serif)",
                  lineHeight: 1.7,
                  maxWidth: "65ch",
                }}
                ariaLabel={`Chunk content: ${chunk.title ?? `Section ${chunk.order + 1}`}`}
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

          <section aria-labelledby="practice-cards-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="practice-cards-heading"
                  className="text-sm font-semibold text-[color:var(--ink)]"
                >
                  Generated Practice Cards
                </h2>
                <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
                  Generated during indexing
                </p>
              </div>
              <span className="rounded border border-[color:var(--border)] px-2 py-0.5 text-xs font-mono text-[color:var(--ink-faint)]">
                {practiceCards.length} card{practiceCards.length === 1 ? "" : "s"}
              </span>
            </div>

            {practiceCards.length > 0 ? (
              <div className="grid gap-3">
                {practiceCards.map((card, index) => {
                  const difficultyLabel = cardDifficultyLabel(card.difficulty);

                  return (
                    <Card key={card.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="eyebrow">Card {index + 1}</p>
                        {difficultyLabel && (
                          <span className="rounded bg-[color:var(--accent-faint)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                            {difficultyLabel}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm font-medium leading-relaxed text-[color:var(--ink)]">
                        {card.front}
                      </p>

                      <div className="mt-3 border-l-2 border-[color:var(--accent)] pl-3">
                        <p className="eyebrow mb-1">Answer</p>
                        <p className="text-sm leading-relaxed text-[color:var(--ink-dim)]">
                          {card.back}
                        </p>
                      </div>

                      {card.explanation && (
                        <p className="mt-3 text-sm leading-relaxed text-[color:var(--ink-dim)]">
                          {card.explanation}
                        </p>
                      )}

                      {card.sourceCitation && (
                        <p className="mt-3 text-xs font-mono text-[color:var(--ink-faint)]">
                          {card.sourceCitation}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-5">
                <p className="text-sm font-medium text-[color:var(--ink)]">
                  No generated cards found for this chunk.
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-dim)]">
                  Re-index this textbook from Library with Anki card generation enabled.
                </p>
              </div>
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
              {nextChunkIdx !== null ? (
                <Link
                  href={`/study/${textbook.id}/${nextChunkIdx}`}
                  className="flex-1 inline-flex items-center justify-center text-xs font-medium rounded-[3px] px-2.5 py-1.5 border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                  aria-label="Next chunk"
                >
                  Next
                </Link>
              ) : (
                <span className="flex-1 inline-flex items-center justify-center text-xs rounded-[3px] px-2.5 py-1.5 text-[color:var(--ink-faint)] opacity-40 border border-[color:var(--border)]">
                  Next
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
