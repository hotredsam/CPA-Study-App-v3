import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review — CPA Study Servant' }

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(sec: number | null): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

export default async function ReviewPage() {
  type RowData = {
    id: string
    title: string | null
    createdAt: Date
    durationSec: number | null
    segmentsCount: number | null
    questionCount: number
    avgScore: number | null
  }

  let recordings: RowData[] = []

  try {
    const raw = await prisma.recording.findMany({
      where: { status: 'done' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { questions: true } },
        questions: {
          select: {
            feedback: {
              select: { combinedScore: true },
            },
          },
        },
      },
    })

    recordings = raw.map((r) => {
      const scores = r.questions
        .map((q) => q.feedback?.combinedScore)
        .filter((s): s is number => s !== null && s !== undefined)
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null

      return {
        id: r.id,
        title: r.title,
        createdAt: r.createdAt,
        durationSec: r.durationSec,
        segmentsCount: r.segmentsCount,
        questionCount: r._count.questions,
        avgScore,
      }
    })
  } catch {
    recordings = []
  }

  return (
    <div>
      <EyebrowHeading
        eyebrow="Review"
        title="Session History"
        right={
          <Link href="/record">
            <Btn variant="primary" size="sm">
              New Recording
            </Btn>
          </Link>
        }
      />

      {recordings.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">
          No completed sessions yet. Record and process a session to review it.
        </p>
      ) : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['TITLE', 'CREATED', 'QUESTIONS', 'AVG SCORE', 'DURATION', 'VIEW'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest font-mono text-[color:var(--ink-faint)] uppercase"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {recordings.map((r, i) => (
                  <tr
                    key={r.id}
                    className={[
                      'border-b border-[color:var(--border)] last:border-0',
                      i % 2 === 1 ? 'bg-[color:var(--canvas-2)]' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 font-medium text-[color:var(--ink)] max-w-[220px] truncate">
                      {r.title ?? `Session ${formatDate(r.createdAt)}`}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--ink-dim)]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[color:var(--ink-dim)]">
                      {r.questionCount}
                    </td>
                    <td className="px-4 py-3">
                      {r.avgScore !== null ? (
                        <span
                          className="mono font-semibold tabular-nums"
                          style={{
                            color:
                              r.avgScore >= 7.5
                                ? 'var(--good)'
                                : r.avgScore >= 5
                                  ? 'var(--warn)'
                                  : 'var(--bad)',
                          }}
                        >
                          {r.avgScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[color:var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--ink-dim)]">
                      {formatDuration(r.durationSec)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/review/${r.id}`}>
                        <Btn variant="ghost" size="sm">
                          Review →
                        </Btn>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
