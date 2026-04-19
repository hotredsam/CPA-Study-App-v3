'use client'

import { useCallback } from 'react'
import { SectionBadge, Bar } from '@/components/ui'
import { TopicDetail } from './TopicDetail'
import type { Topic } from './types'

interface Props {
  topic: Topic
  isExpanded: boolean
  onToggle: (id: string) => void
  onNotesChange: (id: string, notes: string) => void
}

function relTime(isoStr: string | null): string {
  if (!isoStr) return '—'
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
  if (pct >= 75) return 'var(--good)'
  if (pct >= 50) return 'var(--accent)'
  if (pct >= 25) return 'var(--warn)'
  return 'var(--bad)'
}

export function TopicRow({ topic, isExpanded, onToggle, onNotesChange }: Props) {
  const mastery = Math.round(topic.mastery * 100)
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
    <>
      <tr
        className={`border-b border-[color:var(--border)] cursor-pointer hover:bg-[color:var(--canvas)] transition-colors ${
          isExpanded ? 'bg-[color:var(--canvas)]' : ''
        }`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        aria-label={`${topic.name} — click to ${isExpanded ? 'collapse' : 'expand'} details`}
      >
        <td className="py-2.5 px-3 whitespace-nowrap">
          <SectionBadge section={topic.section} size="sm" />
        </td>
        <td className="py-2.5 px-3 font-medium text-[color:var(--ink)] text-sm max-w-[200px] truncate">
          {topic.name}
        </td>
        <td className="py-2.5 px-3 text-[color:var(--ink-dim)] text-xs max-w-[140px] truncate">
          {topic.unit ?? '—'}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2 min-w-[100px]">
            <Bar
              pct={mastery}
              height={5}
              accent={masteryColor(mastery)}
              aria-label={`Mastery ${mastery}%`}
              className="w-16 shrink-0"
            />
            <span className="text-xs font-mono text-[color:var(--ink-dim)] w-8 text-right">
              {mastery}%
            </span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-xs font-mono text-[color:var(--ink-dim)]">
          {errorRate != null ? (
            <span
              style={{
                color:
                  errorRate >= 50
                    ? 'var(--bad)'
                    : errorRate >= 25
                      ? 'var(--warn)'
                      : 'var(--ink-dim)',
              }}
            >
              {errorRate}%
            </span>
          ) : (
            '—'
          )}
        </td>
        <td className="py-2.5 px-3 text-xs font-mono text-[color:var(--ink-dim)]">
          {topic.cardsDue > 0 ? (
            <span style={{ color: 'var(--accent)' }}>{topic.cardsDue}</span>
          ) : (
            '0'
          )}
        </td>
        <td className="py-2.5 px-3 text-xs text-[color:var(--ink-faint)] whitespace-nowrap">
          {relTime(topic.lastSeen)}
        </td>
        <td className="py-2.5 px-3 text-center" aria-hidden="true">
          <span
            className="inline-block transition-transform duration-200 text-[color:var(--ink-faint)]"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
          >
            ▾
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr role="row">
          <td colSpan={8} className="p-0">
            <TopicDetail topic={topic} onNotesChange={onNotesChange} />
          </td>
        </tr>
      )}
    </>
  )
}
