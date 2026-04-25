'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, SectionBadge, Btn } from '@/components/ui'
import { DEFAULT_EXAM_SECTIONS_SETTINGS, useExamSections } from '@/hooks/useExamSections'
import type { CpaSectionCode } from '@/lib/cpa-sections'
import { AutoBadge } from './AutoBadge'
import type { AnkiCard } from './types'

type SectionFilter = 'all' | CpaSectionCode

interface CardsResponse {
  cards: AnkiCard[]
  total: number
}

export function AnkiBrowse() {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<SectionFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: examSettings } = useExamSections()
  const sections: SectionFilter[] = useMemo(
    () => ['all', ...(examSettings?.sections ?? DEFAULT_EXAM_SECTIONS_SETTINGS.sections)],
    [examSettings?.sections],
  )

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('limit', '200')
    if (query.trim()) p.set('q', query.trim())
    if (section !== 'all') p.set('section', section)
    return p
  }, [query, section])

  const { data, isLoading, isError } = useQuery<CardsResponse>({
    queryKey: ['anki-browse', query, section],
    queryFn: async () => {
      const res = await fetch(`/api/anki/cards?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<CardsResponse>
    },
  })

  const cards = data?.cards ?? []

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-3 py-2">
            <span className="text-xs font-mono text-[color:var(--ink-faint)]">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Card fronts, backs, citations..."
              aria-label="Search flashcards"
              className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cards by section">
            {sections.map((s) => (
              <Btn
                key={s}
                size="sm"
                active={section === s}
                onClick={() => setSection(s)}
              >
                {s === 'all' ? 'All' : s}
              </Btn>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-[color:var(--ink-faint)]">
          {cards.length} of {data?.total ?? 0} shown
        </p>
      </Card>

      <Card pad={false}>
        {isLoading && (
          <div className="p-8 text-center text-sm text-[color:var(--ink-faint)]" role="status">
            Loading cards...
          </div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-[color:var(--bad)]" role="alert">
            Failed to load cards.
          </div>
        )}
        {!isLoading && !isError && cards.length === 0 && (
          <div className="p-8 text-center text-sm text-[color:var(--ink-faint)]">
            No cards match the current filters.
          </div>
        )}
        {!isLoading && !isError && cards.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--canvas)]">
                  {['SECT', 'FRONT', 'TYPE', 'REVIEWS', 'INTERVAL', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--ink-faint)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const expanded = expandedId === card.id
                  return (
                    <tr key={card.id} className="border-b border-[color:var(--border)] last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {card.section ? <SectionBadge section={card.section} size="xs" /> : '-'}
                          {card.chunkId ? <AutoBadge /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : card.id)}
                          className="max-w-[520px] text-left text-[color:var(--ink)] hover:text-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                          aria-expanded={expanded}
                        >
                          {card.front}
                        </button>
                        {expanded && (
                          <div className="mt-3 rounded border border-[color:var(--border)] bg-[color:var(--canvas-2)] p-3">
                            <p className="mb-2 text-xs font-mono uppercase tracking-wider text-[color:var(--ink-faint)]">Back</p>
                            <p className="text-sm leading-relaxed text-[color:var(--ink-dim)]">{card.back}</p>
                            {card.explanation && (
                              <>
                                <p className="mb-2 mt-4 text-xs font-mono uppercase tracking-wider text-[color:var(--ink-faint)]">Explanation</p>
                                <p className="text-sm leading-relaxed text-[color:var(--ink-dim)]">{card.explanation}</p>
                              </>
                            )}
                            {card.sourceCitation && (
                              <p className="mt-4 text-xs text-[color:var(--ink-faint)]">{card.sourceCitation}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--ink-dim)]">{card.type}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-[color:var(--ink-dim)]">
                        {card._count.reviews}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-[color:var(--ink-dim)]">
                        {card.srsState.interval}d
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/anki?topicId=${card.topicId ?? ''}`}
                          className="text-xs text-[color:var(--accent)] hover:underline"
                        >
                          Practice
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
