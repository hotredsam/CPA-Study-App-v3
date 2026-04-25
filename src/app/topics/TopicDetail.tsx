'use client'

import { useCallback, useRef, useState } from 'react'
import { Btn } from '@/components/ui'
import { refreshTopicNotes, regenerateAnkiCards } from '@/lib/api-client'
import type { Topic } from './types'

interface Props {
  topic: Topic
  onNotesChange: (id: string, notes: string) => void
}

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message } }))
}

export function TopicDetail({ topic, onNotesChange }: Props) {
  const [localNotes, setLocalNotes] = useState(topic.notes ?? '')
  const [refreshing, setRefreshing] = useState(false)
  const [regenning, setRegenning] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNotesBlur = useCallback(async () => {
    if (localNotes === (topic.notes ?? '')) return
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: localNotes }),
      })
      if (res.ok) {
        onNotesChange(topic.id, localNotes)
        dispatchToast('Notes saved')
      }
    } catch {
      dispatchToast('Failed to save notes')
    }
  }, [localNotes, topic.notes, topic.id, onNotesChange])

  const handleNotesChange = useCallback((value: string) => {
    setLocalNotes(value)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const handleRefreshAiNotes = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshTopicNotes(topic.id)
      dispatchToast('AI notes refreshed')
    } catch {
      dispatchToast('Failed to refresh AI notes')
    } finally {
      setRefreshing(false)
    }
  }, [topic.id])

  const handleRegenAnki = useCallback(async () => {
    setRegenning(true)
    try {
      const result = await regenerateAnkiCards(topic.id)
      dispatchToast(`Regenerated ${result.count} Anki cards`)
    } catch {
      dispatchToast('Failed to regenerate Anki cards')
    } finally {
      setRegenning(false)
    }
  }, [topic.id])

  const aiNotes = topic.aiNotes

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-[color:var(--canvas)] border-t border-[color:var(--border)]"
      role="region"
      aria-label={`Details for ${topic.name}`}
    >
      {/* Col 1 — Notes */}
      <div className="space-y-4">
        {aiNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-2">
              AI Notes
            </p>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ['Core Rule', aiNotes.coreRule],
                  ['Pitfall', aiNotes.pitfall],
                  ['Citation', aiNotes.citation],
                  ['Performance', aiNotes.performance],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[color:var(--ink-faint)] font-medium text-xs">{label}</dt>
                  <dd className="text-[color:var(--ink)] mt-0.5">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          <label
            htmlFor={`notes-${topic.id}`}
            className="block text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-1"
          >
            Your Notes
          </label>
          <textarea
            id={`notes-${topic.id}`}
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            rows={4}
            placeholder="Add your notes here..."
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--ink)] text-sm p-2 resize-y focus:outline focus:outline-2 focus:outline-[color:var(--accent)] placeholder:text-[color:var(--ink-faint)]"
          />
        </div>

        <Btn
          size="sm"
          onClick={handleRefreshAiNotes}
          disabled={refreshing}
          aria-label="Refresh AI notes for this topic"
        >
          {refreshing ? 'Refreshing…' : 'Refresh AI notes'}
        </Btn>
      </div>

      {/* Col 2 — Recent history */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-2">
          Recent History
        </p>
        <p className="text-sm text-[color:var(--ink-faint)] italic">
          No question history linked to this topic yet.
        </p>
      </div>

      {/* Col 3 — Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-2">
          Actions
        </p>
        <a
          href={`/anki?topicId=${topic.id}`}
          className="flex w-full items-center justify-center rounded-[3px] border border-[color:var(--border)] text-[color:var(--ink-dim)] text-sm px-3.5 py-2 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
        >
          Practice {topic.cardsDue} cards
        </a>
        <Btn
          size="sm"
          className="w-full"
          onClick={handleRegenAnki}
          disabled={regenning}
          aria-label="Regenerate Anki cards for this topic"
        >
          {regenning ? 'Regenerating...' : 'Regen Anki cards'}
        </Btn>
        <a
          href={`/study?topicId=${topic.id}`}
          className="flex w-full items-center justify-center rounded-[3px] border border-[color:var(--border)] text-[color:var(--ink-dim)] text-sm px-3.5 py-2 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
        >
          Open in book
        </a>
        <a
          href={`/record?topicId=${topic.id}`}
          className="flex w-full items-center justify-center rounded-[3px] border border-[color:var(--border)] text-[color:var(--ink-dim)] text-sm px-3.5 py-2 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
        >
          Drill this topic
        </a>
        <Btn
          size="sm"
          variant="subtle"
          className="w-full"
          onClick={handleNotesBlur}
          aria-label="Save notes"
        >
          Save notes
        </Btn>
        <div className="mt-3 rounded-[3px] border border-[color:var(--accent-border)] bg-[color:var(--accent-faint)] p-3">
          <p className="eyebrow text-[color:var(--accent)]">WHERE COVERED</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--ink-dim)]">
            Becker FAR 7.3 - FASB ASC 606-10-32 - Ninja FAR Notes p.68
          </p>
        </div>
      </div>
    </div>
  )
}
