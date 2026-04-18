import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function scoreBar(score: number) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm text-neutral-300">{score.toFixed(1)}</span>
    </div>
  );
}

export default async function AnalyticsPage() {
  let rows: Array<{
    questionId: string;
    section: string | null;
    accountingScore: number;
    consultingScore: number | null;
    combinedScore: number;
    weakTopicTags: unknown;
    createdAt: Date;
  }> = [];

  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        questionId: true,
        accountingScore: true,
        consultingScore: true,
        combinedScore: true,
        weakTopicTags: true,
        createdAt: true,
        question: { select: { section: true } },
      },
    });

    rows = feedbacks.map((f) => ({
      questionId: f.questionId,
      section: f.question.section,
      accountingScore: f.accountingScore,
      consultingScore: f.consultingScore,
      combinedScore: f.combinedScore,
      weakTopicTags: f.weakTopicTags,
      createdAt: f.createdAt,
    }));
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-500">Analytics</h1>
        <p className="text-sm text-neutral-400">
          No graded questions yet.{" "}
          <Link href="/record" className="text-brand-500 underline hover:text-brand-300">
            Record a session
          </Link>{" "}
          to see trends here.
        </p>
      </main>
    );
  }

  // Per-section averages
  const bySectionMap: Record<string, { acc: number[]; consulting: number[]; combined: number[] }> =
    {};
  for (const r of rows) {
    const key = r.section ?? "Unknown";
    if (!bySectionMap[key]) bySectionMap[key] = { acc: [], consulting: [], combined: [] };
    bySectionMap[key].acc.push(r.accountingScore);
    if (r.consultingScore !== null) bySectionMap[key].consulting.push(r.consultingScore);
    bySectionMap[key].combined.push(r.combinedScore);
  }
  const sectionStats = Object.entries(bySectionMap)
    .map(([section, data]) => ({
      section,
      count: data.combined.length,
      avgAccounting: data.acc.reduce((a, b) => a + b, 0) / data.acc.length,
      avgConsulting:
        data.consulting.length > 0
          ? data.consulting.reduce((a, b) => a + b, 0) / data.consulting.length
          : null,
      avgCombined: data.combined.reduce((a, b) => a + b, 0) / data.combined.length,
    }))
    .sort((a, b) => b.count - a.count);

  // Weak topic tag frequency
  const tagFreq: Record<string, number> = {};
  for (const r of rows) {
    const tags = Array.isArray(r.weakTopicTags) ? (r.weakTopicTags as string[]) : [];
    for (const tag of tags) {
      if (typeof tag === "string") tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const maxTagFreq = topTags[0]?.[1] ?? 1;

  // Overall stats
  const overallAvg = rows.reduce((a, r) => a + r.combinedScore, 0) / rows.length;
  const last10 = rows.slice(-10);
  const recentAvg = last10.reduce((a, r) => a + r.combinedScore, 0) / last10.length;
  const trend = recentAvg - overallAvg;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-500">Analytics</h1>
        <Link href="/sessions" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← Session history
        </Link>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: "Questions graded", value: String(rows.length) },
          { label: "Overall avg score", value: `${overallAvg.toFixed(1)} / 10` },
          {
            label: "Recent trend (last 10)",
            value: `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}`,
            accent: trend >= 0 ? "text-green-400" : "text-red-400",
          },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-lg border border-neutral-700 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-white"}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* Per-section breakdown */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-200">Scores by CPA section</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-700 text-left text-xs text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Section</th>
                <th className="pb-2 pr-4 font-medium">Questions</th>
                <th className="pb-2 pr-4 font-medium">Accounting avg</th>
                <th className="pb-2 pr-4 font-medium">Consulting avg</th>
                <th className="pb-2 font-medium">Combined avg</th>
              </tr>
            </thead>
            <tbody>
              {sectionStats.map((s) => (
                <tr key={s.section} className="border-b border-neutral-800">
                  <td className="py-3 pr-4 font-mono text-neutral-300">{s.section}</td>
                  <td className="py-3 pr-4 text-neutral-400">{s.count}</td>
                  <td className="py-3 pr-4">{scoreBar(s.avgAccounting)}</td>
                  <td className="py-3 pr-4">
                    {s.avgConsulting !== null ? scoreBar(s.avgConsulting) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3">{scoreBar(s.avgCombined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weak topic tags */}
      {topTags.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-neutral-200">Recurring weak topics</h2>
          <div className="flex flex-col gap-2">
            {topTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="w-48 truncate text-sm text-neutral-300">{tag}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(count / maxTagFreq) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs text-neutral-500">{count}×</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Score over time (last 50) */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-200">
          Score over time{" "}
          <span className="text-sm font-normal text-neutral-500">(last {Math.min(rows.length, 50)} questions)</span>
        </h2>
        <div className="flex h-24 items-end gap-0.5">
          {rows.slice(-50).map((r, i) => {
            const h = Math.max(4, (r.combinedScore / 10) * 96);
            const color =
              r.combinedScore >= 7
                ? "bg-green-500"
                : r.combinedScore >= 5
                  ? "bg-yellow-500"
                  : "bg-red-500";
            return (
              <div
                key={r.questionId + i}
                title={`${r.combinedScore.toFixed(1)} / 10 — ${r.section ?? "?"}`}
                className={`flex-1 rounded-t ${color} opacity-80 hover:opacity-100`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <p className="mt-1 text-xs text-neutral-600">Hover bar for score detail</p>
      </section>
    </main>
  );
}
