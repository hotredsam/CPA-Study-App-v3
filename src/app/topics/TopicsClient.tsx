'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { EyebrowHeading, Btn, Card } from '@/components/ui'
import { bulkRefreshTopicNotes } from '@/lib/api-client'
import { DEFAULT_EXAM_SECTIONS_SETTINGS, useExamSections } from '@/hooks/useExamSections'
import { TopicRow } from './TopicRow'
import type { Topic, SortField, SectionFilter } from './types'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'error', label: 'Highest error rate' },
  { value: 'mastery', label: 'Lowest mastery' },
  { value: 'cards', label: 'Most cards due' },
  { value: 'seen', label: 'Most practiced' },
]

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message } }))
}

export function TopicsClient() {
  const queryClient = useQueryClient()
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all')
  const [sort, setSort] = useState<SortField>('error')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bulkRefreshing, setBulkRefreshing] = useState(false)
  const { data: examSettings } = useExamSections()
  const sections: SectionFilter[] = useMemo(
    () => ['all', ...(examSettings?.sections ?? DEFAULT_EXAM_SECTIONS_SETTINGS.sections)],
    [examSettings?.sections],
  )

  const queryKey = useMemo(
    () => ['topics', sectionFilter, sort, search] as const,
    [sectionFilter, sort, search],
  )

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (sectionFilter !== 'all') params.set('section', sectionFilter)
    if (sort) params.set('sort', sort)
    if (search.trim()) params.set('q', search.trim())
    return params.toString()
  }, [sectionFilter, sort, search])

  const activeFilterCount =
    (sectionFilter !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0) + (sort !== 'error' ? 1 : 0)

  const { data: topics = [], isLoading, isError } = useQuery<Topic[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/topics?${queryString}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<Topic[]>
    },
  })

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleNotesChange = useCallback((id: string, notes: string) => {
    queryClient.setQueryData<Topic[]>(queryKey, (prev) =>
      prev ? prev.map((t) => (t.id === id ? { ...t, notes } : t)) : prev,
    )
  }, [queryClient, queryKey])

  const handleBulkRefresh = useCallback(async () => {
    setBulkRefreshing(true)
    try {
      const result = await bulkRefreshTopicNotes({
        section: sectionFilter !== 'all' ? sectionFilter : undefined,
      })
      const scopeLabel = sectionFilter !== 'all' ? sectionFilter : 'all sections'
      dispatchToast(
        `Refreshed AI notes for ${result.processed} topics (${scopeLabel}). Estimated cost: ~$${(result.processed * 0.002).toFixed(3)}`,
      )
      await queryClient.invalidateQueries({ queryKey })
    } catch {
      dispatchToast('Failed to bulk refresh AI notes')
    } finally {
      setBulkRefreshing(false)
    }
  }, [sectionFilter, queryClient, queryKey])

  const clearFilters = useCallback(() => {
    setSectionFilter('all')
    setSort('error')
    setSearch('')
  }, [])

  return (
    <div>
      <EyebrowHeading
        eyebrow="TOPICS"
        title="Topics extracted by Claude from your textbooks"
        sub={`${topics.length} topics shown across the active CPA sections. Click a row to open notes, history, and re-index actions.`}
        right={
          <div className="flex flex-wrap justify-end gap-1.5">
            {sections.map((s) => (
              <Btn
                key={s}
                size="sm"
                variant="ghost"
                active={sectionFilter === s}
                onClick={() => setSectionFilter(s)}
                aria-label={`Filter by ${s === 'all' ? 'all sections' : s}`}
              >
                {s === 'all' ? 'All' : s}
              </Btn>
            ))}
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sort topics">
          {SORT_OPTIONS.map((opt) => (
            <Btn
              key={opt.value}
              size="sm"
              variant="ghost"
              active={sort === opt.value}
              onClick={() => setSort(opt.value)}
              aria-label={`Sort by ${opt.label}`}
            >
              {opt.label}
            </Btn>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic..."
            aria-label="Search topics"
            className="h-[32px] w-[260px] rounded-[3px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-[13px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline focus:outline-2 focus:outline-[color:var(--accent)]"
          />
          {activeFilterCount > 0 && (
            <Btn size="sm" variant="subtle" onClick={clearFilters}>
              Clear
            </Btn>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="mono text-[11px] text-[color:var(--ink-faint)]">
          {topics.length} shown{activeFilterCount > 0 ? ` - ${activeFilterCount} filters` : ''}
        </p>
        <div className="flex gap-1.5">
          <Btn
            size="sm"
            variant="ghost"
            onClick={handleBulkRefresh}
            disabled={bulkRefreshing}
            aria-label="Refresh AI notes for all shown topics"
          >
            {bulkRefreshing ? 'Refreshing...' : 'Refresh AI notes for all'}
          </Btn>
          <Btn size="sm" variant="primary" aria-label="Process all shown topics">
            Process all shown
          </Btn>
        </div>
      </div>

      <Card pad={false}>
        {isLoading && (
          <div className="p-8 text-center text-sm text-[color:var(--ink-faint)]" role="status" aria-live="polite">
            Loading topics...
          </div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-[color:var(--bad)]" role="alert">
            Failed to load topics. Please try again.
          </div>
        )}
        {!isLoading && !isError && (
          <>
            <div
              className="grid gap-2 border-b border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2.5"
              style={{ gridTemplateColumns: '60px minmax(220px,1fr) 130px 230px 150px 70px 80px 24px' }}
            >
              {['SECT', 'TOPIC', 'UNIT', 'MASTERY', 'ERROR RATE', 'DUE', 'SEEN', ''].map((h) => (
                <div key={h} className="eyebrow whitespace-nowrap">
                  {h}
                </div>
              ))}
            </div>

            {topics.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--ink-faint)]">No topics found.</div>
            ) : (
              topics.map((topic, i) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  isLast={i === topics.length - 1}
                  isExpanded={expandedId === topic.id}
                  onToggle={handleToggle}
                  onNotesChange={handleNotesChange}
                />
              ))
            )}
          </>
        )}
      </Card>
    </div>
  )
}
