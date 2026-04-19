import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { Btn } from '@/components/ui/Btn'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review — CPA Study Servant' }

export default async function ReviewPage() {
  let recordings: Array<{
    id: string
    status: string
    createdAt: Date
    firstQuestionId: string | null
    questionCount: number
  }> = []

  try {
    const raw = await prisma.recording.findMany({
      where: { status: 'done' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        questions: {
          select: { id: true },
          orderBy: { startSec: 'asc' },
          take: 1,
        },
        _count: { select: { questions: true } },
      },
    })
    recordings = raw.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      firstQuestionId: r.questions[0]?.id ?? null,
      questionCount: r._count.questions,
    }))
  } catch {
    recordings = []
  }

  return (
    <div>
      <EyebrowHeading
        eyebrow="Completed sessions"
        title="Review"
        sub="Browse completed recordings and review graded questions."
        right={
          <Link href="/record">
            <Btn variant="primary" size="sm">
              New recording
            </Btn>
          </Link>
        }
      />

      {recordings.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">
          No completed recordings yet. Record a Becker session to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {recordings.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-[color:var(--ink-faint)]">{r.id}</p>
                <p className="text-[color:var(--ink)]">
                  {r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                </p>
              </div>
              <span className="mono text-xs text-[color:var(--ink-faint)]">
                {r.questionCount} q
              </span>
              {r.firstQuestionId ? (
                <Link href={`/review/${r.firstQuestionId}`}>
                  <Btn variant="primary" size="sm">
                    Review
                  </Btn>
                </Link>
              ) : (
                <span className="text-xs text-[color:var(--ink-faint)]">No questions</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
