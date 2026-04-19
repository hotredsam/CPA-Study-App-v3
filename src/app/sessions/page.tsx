import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SessionsFilterClient } from "./SessionsFilterClient";

export const dynamic = "force-dynamic";

const FilterParams = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STATUS_CHIP: Record<string, string> = {
  uploading: "bg-neutral-700 text-neutral-300",
  uploaded: "bg-neutral-700 text-neutral-300",
  segmenting: "bg-yellow-900 text-yellow-300",
  processing_questions: "bg-yellow-900 text-yellow-300",
  done: "bg-green-900 text-green-300",
  failed: "bg-red-900 text-red-300",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams;
  const parsed = FilterParams.safeParse({
    from: typeof rawParams.from === "string" ? rawParams.from : undefined,
    to: typeof rawParams.to === "string" ? rawParams.to : undefined,
  });

  const dateFilter =
    parsed.success && (parsed.data.from ?? parsed.data.to)
      ? {
          createdAt: {
            ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
            ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {}),
          },
        }
      : undefined;

  let recordings: Array<{
    id: string;
    status: string;
    createdAt: Date;
    durationSec: number | null;
    questionCount: number;
    avgScore: number | null;
    firstQuestionId: string | null;
  }> = [];

  try {
    const raw = await prisma.recording.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        questions: { include: { feedback: { select: { combinedScore: true } } } },
      },
      where: dateFilter,
    });

    recordings = raw.map((r) => {
      const scores = r.questions
        .map((q) => q.feedback?.combinedScore ?? null)
        .filter((s): s is number => s !== null);

      const avgScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      return {
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        durationSec: r.durationSec,
        questionCount: r.questions.length,
        avgScore,
        firstQuestionId: r.questions[0]?.id ?? null,
      };
    });
  } catch {
    recordings = [];
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-500">Session History</h1>
      </header>

      <Suspense>
        <SessionsFilterClient />
      </Suspense>

      {recordings.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No sessions yet.{" "}
          <Link href="/record" className="text-brand-500 underline hover:text-brand-300">
            Record your first session
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-xs text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Duration</th>
                <th className="pb-2 pr-4 font-medium">Questions</th>
                <th className="pb-2 pr-4 font-medium">Avg Score</th>
                <th className="pb-2 font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-800 hover:bg-neutral-900"
                >
                  <td className="py-3 pr-4 text-neutral-300">
                    {r.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-xs ${STATUS_CHIP[r.status] ?? "bg-neutral-800 text-neutral-300"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-neutral-300">
                    {formatDuration(r.durationSec)}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">{r.questionCount}</td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {r.avgScore !== null ? `${r.avgScore.toFixed(1)} / 10` : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/recordings/${r.id}/status`}
                        className="rounded border border-neutral-600 px-2 py-1 text-xs hover:border-neutral-400"
                      >
                        Status →
                      </Link>
                      {r.firstQuestionId ? (
                        <Link
                          href={`/review/${r.firstQuestionId}`}
                          className="rounded bg-brand-500 px-2 py-1 text-xs text-white hover:bg-brand-700"
                        >
                          Review →
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
