"use client";

import Link from "next/link";
import { Bar } from "@/components/ui/Bar";
import { Card } from "@/components/ui/Card";
import { SectionBadge } from "@/components/ui/SectionBadge";

type RecentTextbook = {
  id: string;
  title: string;
  lastChunkIdx: number;
  totalChunks: number;
};

type TextbookItem = {
  id: string;
  title: string;
  sections: string[];
  chunkCount: number;
  indexStatus: string;
};

interface Props {
  recentTextbook: RecentTextbook | null;
  textbooks: TextbookItem[];
  cardsDue: number;
}

export function StudyHomeClient({ recentTextbook, textbooks, cardsDue }: Props) {
  const readyTextbooks = textbooks.filter((t) => t.indexStatus === "READY");

  return (
    <div className="space-y-8">
      {/* Cards due banner */}
      {cardsDue > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2"
        >
          <span className="text-sm text-[color:var(--ink-dim)]">
            <span className="font-semibold text-[color:var(--accent)]">{cardsDue}</span> Anki card
            {cardsDue !== 1 ? "s" : ""} due for review
          </span>
          <Link
            href="/anki"
            className="ml-auto text-xs text-[color:var(--accent)] underline underline-offset-2 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
          >
            Review now
          </Link>
        </div>
      )}

      {/* Resume hero */}
      {recentTextbook && (
        <section aria-label="Continue reading">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
            Continue
          </h2>
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <p className="mb-1 text-xs text-[color:var(--ink-faint)] uppercase tracking-wide">
                  Resume reading
                </p>
                <h3 className="text-lg font-semibold text-[color:var(--ink)] truncate">
                  {recentTextbook.title}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--ink-dim)]">
                  Chunk {recentTextbook.lastChunkIdx + 1} of {recentTextbook.totalChunks}
                </p>
                <div className="mt-3">
                  <Bar
                    pct={
                      recentTextbook.totalChunks > 0
                        ? ((recentTextbook.lastChunkIdx + 1) / recentTextbook.totalChunks) * 100
                        : 0
                    }
                    aria-label={`Progress: chunk ${recentTextbook.lastChunkIdx + 1} of ${recentTextbook.totalChunks}`}
                  />
                </div>
              </div>
              <div className="shrink-0">
                <Link
                  href={`/study/${recentTextbook.id}/${recentTextbook.lastChunkIdx}`}
                  className="inline-flex items-center justify-center font-medium rounded-[3px] text-sm px-3.5 py-2 bg-[color:var(--accent)] text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                >
                  Resume
                </Link>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Textbook grid */}
      {readyTextbooks.length > 0 ? (
        <section aria-label="Your textbooks">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
            Textbooks
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {readyTextbooks.map((book) => (
              <Card key={book.id} className="flex flex-col gap-3 p-5">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[color:var(--ink)] leading-snug line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
                    {book.chunkCount} chunk{book.chunkCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {book.sections.length > 0 && (
                  <div className="flex flex-wrap gap-1" aria-label="Sections covered">
                    {book.sections.map((s) => (
                      <SectionBadge key={s} section={s} size="xs" />
                    ))}
                  </div>
                )}
                <Link
                  href={`/study/${book.id}/0`}
                  className="inline-flex items-center justify-center font-medium rounded-[3px] text-xs px-2.5 py-1.5 border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                  aria-label={`Start ${book.title} from beginning`}
                >
                  Start from beginning
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded border border-dashed border-[color:var(--border)] p-10 text-center">
          <p className="text-sm text-[color:var(--ink-dim)]">
            Upload textbooks in the{" "}
            <Link
              href="/library"
              className="text-[color:var(--accent)] underline underline-offset-2 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            >
              Library
            </Link>{" "}
            to start studying.
          </p>
        </div>
      )}

      {/* Non-ready textbooks hint */}
      {textbooks.filter((t) => t.indexStatus !== "READY").length > 0 && (
        <section aria-label="Indexing in progress">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]">
            Indexing
          </h2>
          <div className="space-y-2">
            {textbooks
              .filter((t) => t.indexStatus !== "READY")
              .map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[color:var(--ink)] truncate">
                      {book.title}
                    </p>
                  </div>
                  <span className="shrink-0 rounded px-2 py-0.5 text-xs font-mono bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--ink-faint)]">
                    {book.indexStatus}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
