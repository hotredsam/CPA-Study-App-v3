'use client'

import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EyebrowHeading, Btn, Card } from '@/components/ui'
import { bulkRefreshTopicNotes } from '@/lib/api-client'
import { TopicRow } from './TopicRow'
import type { Topic, SortField, SectionFilter } from './types'

const SECTIONS: SectionFilter[] = ['all', 'FAR', 'REG', 'AUD', 'TCP', 'BAR', 'ISC']
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'error', label: 'Error Rate ↓' },
  { value: 'mastery', label: 'Mastery ↑' },
  { value: 'cards', label: 'Cards Due ↓' },
  { value: 'seen', label: 'Last Seen ↓' },
]

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message } }))
}

export function TopicsClient() {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all')
  const [sort, setSort] = useState<SortField>('error')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bulkRefreshing, setBulkRefreshing] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])

  const params = new URLSearchParams()
  if (sectionFilter !== 'all') params.set('section', sectionFilter)
  if (sort) params.set('sort', sort)
  if (search.trim()) params.set('q', search.trim())

  const { isLoading, isError } = useQuery<Topic[]>({
    queryKey: ['topics', sectionFilter, sort, search],
    queryFn: async () => {
      const res = await fetch(`/api/topics?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Topic[]
      setTopics(data)
      return data
    },
  })

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, notes } : t)),
    )
  }, [])

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
    } catch {
      dispatchToast('Failed to bulk refresh AI notes')
    } finally {
      setBulkRefreshing(false)
    }
  }, [sectionFilter])

  return (
    <div>
      <EyebrowHeading
        eyebrow="Topics"
        title="Topic Mastery"
        right={
          <div className="flex gap-2">
            <Btn
              onClick={handleBulkRefresh}
              disabled={bulkRefreshing}
              aria-label="Refresh AI notes for all shown topics"
            >
              {bulkRefreshing ? 'Refreshing…' : 'Refresh AI notes for all'}
            </Btn>
            <Btn variant="primary" aria-label="Process all shown topics">
              Process all shown
            </Btn>
          </div>
        }
      />

      {/* Search */}
      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics…"
          aria-label="Search topics"
          className="w-full max-w-xs rounded border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--ink)] text-sm px-3 py-1.5 focus:outline focus:outline-2 focus:outline-[color:var(--accent)] placeholder:text-[color:var(--ink-faint)]"
        />
      </div>

      {/* Section filter pills */}
      <div
        className="flex flex-wrap gap-1.5 mb-3"
        role="group"
        aria-label="Filter by section"
      >
        {SECTIONS.map((s) => (
          <Btn
            key={s}
            size="sm"
            active={sectionFilter === s}
            onClick={() => setSectionFilter(s)}
            aria-label={`Filter by ${s === 'all' ? 'all sections' : s}`}
          >
            {s === 'all' ? 'All' : s}
          </Btn>
        ))}
      </div>

      {/* Sort row */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        role="group"
        aria-label="Sort topics"
      >
        {SORT_OPTIONS.map((opt) => (
          <Btn
            key={opt.value}
            size="sm"
            active={sort === opt.value}
            onClick={() => setSort(opt.value)}
            aria-label={`Sort by ${opt.label}`}
          >
            {opt.label}
          </Btn>
        ))}
      </div>

      {/* Table */}
      <Card pad={false}>
        {isLoading && (
          <div
            className="p-8 text-center text-sm text-[color:var(--ink-faint)]"
            role="status"
            aria-live="polite"
          >
            Loading topics…
          </div>
        )}
        {isError && (
          <div
            className="p-8 text-center text-sm text-[color:var(--bad)]"
            role="alert"
          >
            Failed to load topics. Please try again.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--canvas)]">
                  {['SECT', 'TOPIC', 'UNIT', 'MASTERY', 'ERROR RATE', 'CARDS', 'SEEN', ''].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {topics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-sm text-[color:var(--ink-faint)]"
                    >
                      No topics found.
                    </td>
                  </tr>
                ) : (
                  topics.map((topic) => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      isExpanded={expandedId === topic.id}
                      onToggle={handleToggle}
                      onNotesChange={handleNotesChange}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
