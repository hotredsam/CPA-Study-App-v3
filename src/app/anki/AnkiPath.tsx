'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, SectionBadge, Bar } from '@/components/ui'
import { normalizePercent } from '@/lib/percent'

interface Topic {
  id: string
  section: string
  name: string
  unit: string | null
  mastery: number
  cardsDue: number
}

export function AnkiPath() {
  const { data: topics, isLoading, isError } = useQuery<Topic[]>({
    queryKey: ['topics', undefined, undefined, undefined],
    queryFn: async () => {
      const res = await fetch('/api/topics?sort=mastery')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<Topic[]>
    },
  })

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-4">
        Learning Path
      </p>

      {isLoading && (
        <div
          className="text-sm text-[color:var(--ink-faint)] py-4"
          role="status"
          aria-live="polite"
        >
          Loading topics…
        </div>
      )}

      {isError && (
        <div className="text-sm text-[color:var(--bad)] py-4" role="alert">
          Failed to load topics.
        </div>
      )}

      {!isLoading && !isError && (
        <ul className="space-y-2" aria-label="Topic learning path">
          {(topics ?? []).map((topic) => {
            const mastery = normalizePercent(topic.mastery)
            return (
              <li
                key={topic.id}
                className="flex items-center gap-3 py-2 border-b border-[color:var(--border)] last:border-0"
              >
                <SectionBadge section={topic.section} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[color:var(--ink)] truncate">{topic.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Bar
                      pct={mastery}
                      height={4}
                      aria-label={`Mastery ${mastery}%`}
                      className="w-24 shrink-0"
                    />
                    <span className="text-xs font-mono text-[color:var(--ink-faint)]">
                      {mastery}%
                    </span>
                    {topic.cardsDue > 0 && (
                      <span className="text-xs font-mono text-[color:var(--accent)]">
                        {topic.cardsDue} due
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`/study?topicId=${topic.id}`}
                  className="shrink-0 text-xs font-medium rounded-[3px] border border-[color:var(--border)] text-[color:var(--ink-dim)] px-2.5 py-1 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                  aria-label={`Study ${topic.name}`}
                >
                  Study
                </a>
              </li>
            )
          })}

          {(topics ?? []).length === 0 && (
            <li className="py-8 text-center text-sm text-[color:var(--ink-faint)]">
              No topics found. Add textbooks to generate a learning path.
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}
