import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let recordings: Array<{
    id: string;
    status: string;
    createdAt: Date;
    firstQuestionId: string | null;
  }> = [];
  try {
    const raw = await prisma.recording.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        questions: {
          select: { id: true },
          orderBy: { startSec: "asc" },
          take: 1,
        },
      },
    });
    recordings = raw.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      firstQuestionId: r.questions[0]?.id ?? null,
    }));
  } catch {
    recordings = [];
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-brand-500">CPA Study Servant</h1>
        <p className="mt-2 text-lg text-neutral-300">
          Record a Becker practice session. Get a graded rundown of both your accounting knowledge
          and your spoken reasoning.
        </p>
      </header>

      <div className="flex justify-center gap-3">
        <Link
          href="/record"
          className="rounded-md bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Start recording
        </Link>
        <Link
          href="/sessions"
          className="rounded-md border border-neutral-600 px-4 py-2 font-medium text-neutral-200 hover:border-neutral-400"
        >
          Sessions
        </Link>
        <Link
          href="/analytics"
          className="rounded-md border border-neutral-600 px-4 py-2 font-medium text-neutral-200 hover:border-neutral-400"
        >
          Analytics
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Recent sessions</h2>
        {recordings.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No recordings yet. Record one to see it here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recordings.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded border border-neutral-700 p-3 text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-neutral-400">{r.id}</p>
                  <p className="text-neutral-300">
                    {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs">
                  {r.status}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/recordings/${r.id}/status`}
                    className="rounded border border-neutral-600 px-2 py-1 hover:border-neutral-400"
                  >
                    Status
                  </Link>
                  {r.firstQuestionId ? (
                    <Link
                      href={`/review/${r.firstQuestionId}`}
                      className="rounded bg-brand-500 px-2 py-1 text-white hover:bg-brand-700"
                    >
                      Review
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-neutral-500">Phase 1 MVP — pipeline live.</p>
    </main>
  );
}
