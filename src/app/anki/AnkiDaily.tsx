'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, SectionBadge } from '@/components/ui'
import type { AnkiMode, DueSectionBreakdown } from './types'

interface Props {
  setMode: (mode: AnkiMode) => void
}

interface DueResponse {
  count: number
  breakdown?: DueSectionBreakdown[]
}

interface ReviewStatsResponse {
  streak: number
  totalCards: number
  retentionRate: number | null
  backlog: number
}

export function AnkiDaily({ setMode }: Props) {
  const { data: dueData, isLoading: dueLoading } = useQuery<DueResponse>({
    queryKey: ['anki-due-breakdown'],
    queryFn: async () => {
      const res = await fetch('/api/anki/due?breakdown=true')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<DueResponse>
    },
    refetchInterval: 60_000,
  })

  // Stats: derive from available data (no dedicated stats endpoint yet)
  const { data: statsData } = useQuery<ReviewStatsResponse>({
    queryKey: ['anki-stats'],
    queryFn: async (): Promise<ReviewStatsResponse> => {
      // TODO(fidelity): Add a dedicated /api/anki/stats endpoint with real streak + retention
      return { streak: 0, totalCards: 0, retentionRate: null, backlog: 0 }
    },
  })

  const count = dueData?.count ?? 0
  const breakdown = dueData?.breakdown ?? []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Due today card */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-2">
          Today&apos;s Review
        </p>
        {dueLoading ? (
          <div
            className="text-[color:var(--ink-faint)] text-sm"
            role="status"
            aria-live="polite"
          >
            Loading…
          </div>
        ) : (
          <>
            <div
              className="text-6xl font-mono font-bold text-[color:var(--ink)] mb-1"
              aria-label={`${count} cards due today`}
            >
              {count}
            </div>
            <p className="text-sm text-[color:var(--ink-faint)] mb-6">
              {count === 1 ? 'card due today' : 'cards due today'}
            </p>

            <button
              type="button"
              onClick={() => setMode('practice')}
              disabled={count === 0}
              className="inline-flex items-center justify-center rounded-[3px] bg-[color:var(--accent)] text-white text-sm font-medium px-5 py-2.5 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              aria-label="Start review session"
            >
              Start Session
            </button>

            {breakdown.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-2">
                  By Section
                </p>
                <ul className="space-y-1.5" aria-label="Cards due by section">
                  {breakdown.map((item) => (
                    <li key={item.section} className="flex items-center gap-2 text-sm">
                      <SectionBadge section={item.section} size="xs" />
                      <span className="text-[color:var(--ink-dim)]">{item.count} due</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Right: Stats card */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-4">
          Stats
        </p>
        <dl className="space-y-4">
          <div className="flex justify-between items-baseline">
            <dt className="text-sm text-[color:var(--ink-faint)]">Streak</dt>
            <dd className="text-2xl font-mono font-bold text-[color:var(--ink)]">
              {statsData?.streak ?? 0}
              <span className="text-sm font-normal text-[color:var(--ink-faint)] ml-1">days</span>
            </dd>
          </div>
          <div className="flex justify-between items-baseline">
            <dt className="text-sm text-[color:var(--ink-faint)]">Total cards</dt>
            <dd className="text-2xl font-mono font-bold text-[color:var(--ink)]">
              {statsData?.totalCards ?? 0}
            </dd>
          </div>
          <div className="flex justify-between items-baseline">
            <dt className="text-sm text-[color:var(--ink-faint)]">Retention (30d)</dt>
            <dd className="text-2xl font-mono font-bold text-[color:var(--ink)]">
              {statsData?.retentionRate != null
                ? `${Math.round(statsData.retentionRate * 100)}%`
                : '—'}
            </dd>
          </div>
          <div className="flex justify-between items-baseline">
            <dt className="text-sm text-[color:var(--ink-faint)]">Backlog</dt>
            <dd className="text-2xl font-mono font-bold text-[color:var(--ink)]">
              {statsData?.backlog ?? 0}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
