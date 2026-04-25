'use client'

import { useCallback } from 'react'
import { SectionBadge, Bar } from '@/components/ui'
import { TopicDetail } from './TopicDetail'
import type { Topic } from './types'

interface Props {
  topic: Topic
  isLast: boolean
  isExpanded: boolean
  onToggle: (id: string) => void
  onNotesChange: (id: string, notes: string) => void
}

function relTime(isoStr: string | null): string {
  if (!isoStr) return '-'
  const diff = Date.now() - new Date(isoStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function masteryColor(pct: number): string {
  if (pct >= 70) return 'var(--good)'
  if (pct >= 40) return 'var(--warn)'
  return 'var(--bad)'
}

function errorColor(pct: number | null): string {
  if (pct == null) return 'var(--ink-faint)'
  if (pct > 50) return 'var(--bad)'
  if (pct > 25) return 'var(--warn)'
  return 'var(--good)'
}

export function TopicRow({ topic, isLast, isExpanded, onToggle, onNotesChange }: Props) {
  const mastery = Math.round(topic.mastery)
  const errorRate = topic.errorRate != null ? Math.round(topic.errorRate * 100) : null

  const handleToggle = useCallback(() => {
    onToggle(topic.id)
  }, [onToggle, topic.id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onToggle(topic.id)
      }
    },
    [onToggle, topic.id],
  )

  return (
    <div className={isLast && !isExpanded ? '' : 'border-b border-[color:var(--border)]'}>
      <div
        className="grid cursor-pointer items-center gap-2 px-4 py-3 hov"
        style={{ gridTemplateColumns: '60px minmax(220px,1fr) 130px 230px 150px 70px 80px 24px' }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${topic.name} - click to ${isExpanded ? 'collapse' : 'expand'} details`}
      >
        <SectionBadge section={topic.section} size="xs" />
        <div className="min-w-0 text-[13px] text-[color:var(--ink)]">{topic.name}</div>
        <div className="mono min-w-0 truncate text-[11px] text-[color:var(--ink-faint)]">
          {topic.unit ?? '-'}
        </div>
        <div className="flex min-w-0 items-center gap-3 pr-10">
          <div className="min-w-0 flex-1">
            <Bar pct={mastery} height={4} accent={masteryColor(mastery)} aria-label={`Mastery ${mastery}%`} />
          </div>
          <span className="mono tabular w-[48px] shrink-0 text-right text-[11px] text-[color:var(--ink-dim)]">
            {mastery}%
          </span>
        </div>
        <div
          className="mono tabular whitespace-nowrap pl-8 text-[12px]"
          style={{ color: errorColor(errorRate) }}
        >
          {errorRate == null ? '-' : `${errorRate}%`}
        </div>
        <div className="mono tabular text-[12px]" style={{ color: topic.cardsDue > 0 ? 'var(--accent)' : 'var(--ink-faint)' }}>
          {topic.cardsDue}
        </div>
        <div className="mono tabular whitespace-nowrap text-[12px] text-[color:var(--ink-dim)]">
          {relTime(topic.lastSeen)}
        </div>
        <div className="text-center text-[color:var(--ink-faint)]" aria-hidden="true">
          {isExpanded ? '^' : 'v'}
        </div>
      </div>

      {isExpanded && <TopicDetail topic={topic} onNotesChange={onNotesChange} />}
    </div>
  )
}
