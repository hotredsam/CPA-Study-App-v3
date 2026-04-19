'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, Card } from '@/components/ui'
import type { AnkiCard, AnkiRating } from './types'

interface CardsResponse {
  cards: AnkiCard[]
  total: number
}

interface Props {
  topicId?: string
}

const RATINGS: { value: AnkiRating; label: string; key: '1' | '2' | '3' | '4' }[] = [
  { value: 'AGAIN', label: 'Again (1)', key: '1' },
  { value: 'HARD', label: 'Hard (2)', key: '2' },
  { value: 'GOOD', label: 'Good (3)', key: '3' },
  { value: 'EASY', label: 'Easy (4)', key: '4' },
]

const RATING_COLORS: Record<AnkiRating, string> = {
  AGAIN: 'var(--bad)',
  HARD: 'var(--warn)',
  GOOD: 'var(--accent)',
  EASY: 'var(--good)',
}

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message } }))
}

export function AnkiPractice({ topicId }: Props) {
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [askInput, setAskInput] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  // Track reviewed cards so we don't reshow them in the same session
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const askInputRef = useRef<HTMLInputElement>(null)

  const params = new URLSearchParams()
  if (topicId) params.set('topicId', topicId)
  params.set('limit', '50')

  const { data, isLoading, isError } = useQuery<CardsResponse>({
    queryKey: ['anki-cards', topicId],
    queryFn: async () => {
      const res = await fetch(`/api/anki/cards?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<CardsResponse>
    },
  })

  const cards = data?.cards ?? []
  const currentCard = cards[cardIndex] ?? null
  const progress = cards.length > 0 ? ((cardIndex) / cards.length) * 100 : 0

  // Keyboard shortcuts: Space to flip, 1-4 to rate (only when not in an input)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (isInput) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!flipped) setFlipped(true)
        return
      }

      if (flipped && !submittingRating) {
        const ratingMap: Record<string, AnkiRating> = {
          '1': 'AGAIN',
          '2': 'HARD',
          '3': 'GOOD',
          '4': 'EASY',
        }
        const rating = ratingMap[e.key]
        if (rating && currentCard) {
          void handleRate(rating)
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, submittingRating, currentCard])

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev)
  }, [])

  const handleRate = useCallback(
    async (rating: AnkiRating) => {
      if (!currentCard || submittingRating) return
      setSubmittingRating(true)
      try {
        const res = await fetch(`/api/anki/${currentCard.id}/review`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rating }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setReviewedIds((prev) => new Set([...prev, currentCard.id]))
        setCardIndex((i) => i + 1)
        setFlipped(false)
        setAskOpen(false)
        setAskInput('')
      } catch {
        dispatchToast('Failed to submit rating')
      } finally {
        setSubmittingRating(false)
      }
    },
    [currentCard, submittingRating],
  )

  const handleAskSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!askInput.trim() || !currentCard) return
      // Post to chat API with anki context
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: askInput,
            context: { topicId: currentCard.topicId },
          }),
        })
        dispatchToast('Question sent to AI tutor')
        setAskInput('')
        setAskOpen(false)
      } catch {
        dispatchToast('Failed to send message')
      }
    },
    [askInput, currentCard],
  )

  if (isLoading) {
    return (
      <div
        className="text-center py-16 text-[color:var(--ink-faint)] text-sm"
        role="status"
        aria-live="polite"
      >
        Loading cards…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-[color:var(--bad)] text-sm" role="alert">
        Failed to load cards.
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[color:var(--ink-faint)] text-sm mb-2">No cards available.</p>
        <p className="text-xs text-[color:var(--ink-faint)]">
          Generate Anki cards from the Topics screen first.
        </p>
      </div>
    )
  }

  if (cardIndex >= cards.length) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl font-semibold text-[color:var(--ink)] mb-2">Session complete!</p>
        <p className="text-sm text-[color:var(--ink-faint)] mb-4">
          You reviewed {reviewedIds.size} cards.
        </p>
        <button
          type="button"
          onClick={() => {
            setCardIndex(0)
            setFlipped(false)
            setReviewedIds(new Set())
          }}
          className="inline-flex items-center justify-center rounded-[3px] bg-[color:var(--accent)] text-white text-sm font-medium px-5 py-2.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
        >
          Restart
        </button>
      </div>
    )
  }

  const card = currentCard!
  const srsState = card.srsState

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
      {/* Left: Card flip area */}
      <div className="space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <Bar
            pct={progress}
            height={6}
            aria-label={`Card ${cardIndex + 1} of ${cards.length}`}
            className="flex-1"
          />
          <span className="text-xs text-[color:var(--ink-faint)] shrink-0 font-mono">
            {cardIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Card face — click or Space to flip */}
        <button
          type="button"
          onClick={handleFlip}
          aria-label={flipped ? 'Card back — click to flip to front' : 'Card front — click to reveal back'}
          className="w-full text-left rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-8 min-h-[200px] flex flex-col justify-center cursor-pointer hover:border-[color:var(--accent)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
        >
          {!flipped ? (
            <p
              className="text-2xl font-serif text-[color:var(--ink)] leading-relaxed italic"
              style={{ fontFamily: 'var(--font-serif, serif)' }}
            >
              {card.front}
            </p>
          ) : (
            <div className="space-y-4">
              <p
                className="text-xl font-semibold text-[color:var(--ink)]"
              >
                {card.back}
              </p>
              {card.explanation && (
                <p className="text-sm text-[color:var(--ink-dim)] border-t border-[color:var(--border)] pt-3">
                  {card.explanation}
                </p>
              )}
            </div>
          )}

          {!flipped && (
            <p className="text-xs text-[color:var(--ink-faint)] mt-6">
              Press Space or click to reveal
            </p>
          )}
        </button>

        {/* Rating buttons — only visible after flip */}
        {flipped && (
          <div
            className="flex gap-2 flex-wrap"
            role="group"
            aria-label="Rate your recall"
          >
            {RATINGS.map(({ value, label, key }) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleRate(value)}
                disabled={submittingRating}
                aria-label={`${label} — keyboard shortcut ${key}`}
                className="flex-1 min-w-[80px] rounded-[3px] text-sm font-medium py-2.5 px-3 border-2 text-white hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] transition-all"
                style={{
                  borderColor: RATING_COLORS[value],
                  background: RATING_COLORS[value],
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {flipped && (
          <p className="text-xs text-[color:var(--ink-faint)] text-center">
            Keyboard: 1 Again · 2 Hard · 3 Good · 4 Easy
          </p>
        )}
      </div>

      {/* Right rail */}
      <div className="space-y-4">
        {/* Ask AI accordion */}
        <Card>
          <button
            type="button"
            onClick={() => {
              setAskOpen((prev) => !prev)
              if (!askOpen) {
                setTimeout(() => askInputRef.current?.focus(), 50)
              }
            }}
            className="w-full flex items-center justify-between text-sm font-medium text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] rounded"
            aria-expanded={askOpen}
            aria-controls="ask-ai-panel"
          >
            <span>Ask AI</span>
            <span
              className="text-[color:var(--ink-faint)] transition-transform duration-200"
              aria-hidden="true"
              style={{ transform: askOpen ? 'rotate(180deg)' : 'none' }}
            >
              ▾
            </span>
          </button>
          {askOpen && (
            <form
              id="ask-ai-panel"
              onSubmit={handleAskSubmit}
              className="mt-3 flex gap-2"
            >
              <input
                ref={askInputRef}
                type="text"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask about this card…"
                aria-label="Ask AI a question about this card"
                className="flex-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--ink)] text-sm px-3 py-1.5 focus:outline focus:outline-2 focus:outline-[color:var(--accent)] placeholder:text-[color:var(--ink-faint)]"
              />
              <button
                type="submit"
                disabled={!askInput.trim()}
                className="rounded-[3px] bg-[color:var(--accent)] text-white text-sm px-3 py-1.5 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
              >
                Ask
              </button>
            </form>
          )}
        </Card>

        {/* Card stats */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-3">
            Card Stats
          </p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[color:var(--ink-faint)]">Ease</dt>
              <dd className="font-mono text-[color:var(--ink)]">
                {srsState.ease.toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--ink-faint)]">Interval</dt>
              <dd className="font-mono text-[color:var(--ink)]">
                {srsState.interval}d
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--ink-faint)]">Lapses</dt>
              <dd className="font-mono text-[color:var(--ink)]">
                {srsState.lapses}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--ink-faint)]">Reviews</dt>
              <dd className="font-mono text-[color:var(--ink)]">
                {card._count.reviews}
              </dd>
            </div>
          </dl>

          {card.sourceCitation && (
            <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
              <p className="text-xs text-[color:var(--ink-faint)]">{card.sourceCitation}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
