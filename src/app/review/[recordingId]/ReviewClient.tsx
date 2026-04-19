'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Feedback, Topic, CpaSection } from '@prisma/client'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { Card } from '@/components/ui/Card'
import { Score } from '@/components/ui/Score'
import { Bar } from '@/components/ui/Bar'
import { Btn } from '@/components/ui/Btn'
import { SectionBadge } from '@/components/ui/SectionBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractedShape = {
  question?: string
  choices?: string[]
  correctIndex?: number
  userAnswer?: string
  correctAnswer?: string
  beckerExplanation?: string
  section?: string
}

type TranscriptWord = { start?: number; end?: number; word?: string }
type TranscriptSegment = {
  start?: number
  end?: number
  text?: string
  words?: TranscriptWord[]
}
type TranscriptShape = { segments?: TranscriptSegment[] }

type FeedbackItem = { key: string; score?: number; body?: string }

export type ReviewQuestion = {
  id: string
  startSec: number
  endSec: number
  section: CpaSection | null
  status: string
  noAudio: boolean
  transcript: unknown
  extracted: unknown
  tags: unknown
  feedback: Pick<
    Feedback,
    | 'accountingScore'
    | 'consultingScore'
    | 'combinedScore'
    | 'items'
    | 'whatYouNeedToLearn'
  > | null
  topic: Pick<Topic, 'id' | 'name' | 'section'> | null
}

export type ReviewRecording = {
  id: string
  title: string | null
  createdAt: Date | string
  status: string
  durationSec: number | null
  sections: CpaSection[]
}

type Layout = 'split' | 'stacked'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreDot(question: ReviewQuestion): string {
  const score = question.feedback?.combinedScore ?? null
  if (score === null) return 'var(--ink-faint)'
  if (score >= 7.5) return 'var(--good)'
  if (score >= 5) return 'var(--warn)'
  return 'var(--bad)'
}

function parseFeedbackItems(items: unknown): FeedbackItem[] {
  if (!items || typeof items !== 'object') return []
  const container = items as { items?: unknown }
  const arr = Array.isArray(container.items) ? container.items : Array.isArray(items) ? items : null
  if (!arr) return []
  return arr.filter(
    (i): i is { key: string; score?: number; body?: string } =>
      !!i && typeof i === 'object' && typeof (i as { key?: unknown }).key === 'string',
  )
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function estimateFillers(text: string): number {
  const fillers = /\b(um|uh|like|you know|basically|actually|literally|so|right)\b/gi
  return (text.match(fillers) ?? []).length
}

function estimateHedges(text: string): number {
  const hedges = /\b(maybe|perhaps|probably|possibly|I think|I guess|kind of|sort of|might)\b/gi
  return (text.match(hedges) ?? []).length
}

function estimatePace(segments: TranscriptSegment[]): string {
  if (segments.length === 0) return '—'
  const totalWords = segments.reduce((acc, s) => acc + countWords(s.text ?? ''), 0)
  const duration =
    (segments[segments.length - 1]?.end ?? 0) - (segments[0]?.start ?? 0)
  if (duration <= 0) return '—'
  const wpm = Math.round((totalWords / duration) * 60)
  return `${wpm} wpm`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionSelector({
  questions,
  activeIdx,
  onSelect,
}: {
  questions: ReviewQuestion[]
  activeIdx: number
  onSelect: (idx: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeIdx])

  return (
    <div
      ref={containerRef}
      className="flex gap-1.5 overflow-x-auto pb-1 mb-6"
      role="tablist"
      aria-label="Questions"
    >
      {questions.map((q, i) => {
        const isActive = i === activeIdx
        const dotColor = getScoreDot(q)
        return (
          <button
            key={q.id}
            ref={isActive ? activeRef : null}
            role="tab"
            aria-selected={isActive}
            aria-label={`Question ${i + 1}`}
            type="button"
            onClick={() => onSelect(i)}
            className="shrink-0 flex items-center justify-center rounded text-xs font-mono font-semibold hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{
              width: 28,
              height: 28,
              background: dotColor + '22',
              color: dotColor,
              border: isActive
                ? `2px solid ${dotColor}`
                : '2px solid transparent',
            }}
          >
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

function QuestionCard({ question }: { question: ReviewQuestion }) {
  const extracted = (question.extracted ?? null) as ExtractedShape | null
  const q = extracted?.question ?? '(question text pending)'
  const choices = extracted?.choices ?? []
  const correctIndex = extracted?.correctIndex

  const labels = ['A', 'B', 'C', 'D', 'E']

  return (
    <Card>
      <p className="eyebrow mb-3">Question</p>
      <p className="text-[color:var(--ink)] leading-relaxed">{q}</p>
      {choices.length > 0 && (
        <ol className="mt-4 space-y-1.5" aria-label="Answer choices">
          {choices.map((choice, i) => {
            const label = labels[i] ?? String(i + 1)
            const isCorrect = correctIndex !== undefined && i === correctIndex
            return (
              <li
                key={i}
                className="flex items-start gap-2 rounded px-3 py-2 text-sm"
                style={{
                  background: isCorrect
                    ? 'var(--good-soft)'
                    : 'var(--canvas-2)',
                  color: isCorrect ? 'var(--good)' : 'var(--ink-dim)',
                  border: isCorrect ? '1px solid var(--good)' : '1px solid var(--border)',
                }}
              >
                <span
                  className="shrink-0 font-mono font-semibold text-xs mt-0.5"
                  aria-hidden="true"
                >
                  {label}
                </span>
                <span>{choice}</span>
              </li>
            )
          })}
        </ol>
      )}
      {(extracted?.userAnswer || extracted?.correctAnswer) && (
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-[color:var(--ink-faint)]">Your answer</dt>
          <dd className="text-[color:var(--ink-dim)]">{extracted?.userAnswer ?? '—'}</dd>
          <dt className="text-[color:var(--ink-faint)]">Correct</dt>
          <dd className="text-[color:var(--ink-dim)]">{extracted?.correctAnswer ?? '—'}</dd>
        </dl>
      )}
      {extracted?.beckerExplanation && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]">
            Becker explanation
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--ink-dim)] leading-relaxed">
            {extracted.beckerExplanation}
          </p>
        </details>
      )}
    </Card>
  )
}

function TranscriptCard({ question }: { question: ReviewQuestion }) {
  const transcript = (question.transcript ?? null) as TranscriptShape | null
  const segments = transcript?.segments ?? []
  const fullText = segments.map((s) => s.text ?? '').join(' ')
  const wordCount = countWords(fullText)
  const fillerCount = estimateFillers(fullText)
  const hedgeCount = estimateHedges(fullText)
  const pace = estimatePace(segments)

  return (
    <Card>
      <p className="eyebrow mb-3">Transcript</p>

      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        {[
          { label: 'Words', value: String(wordCount) },
          { label: 'Hedges (est.)', value: String(hedgeCount) },
          { label: 'Fillers (est.)', value: String(fillerCount) },
          { label: 'Pace', value: pace },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded px-2 py-2"
            style={{ background: 'var(--canvas-2)', border: '1px solid var(--border)' }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--ink-faint)]">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold mono text-[color:var(--ink)]">{value}</p>
          </div>
        ))}
      </div>

      {question.noAudio ? (
        <p className="text-sm text-[color:var(--ink-faint)]">No speech detected in this clip.</p>
      ) : segments.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">Transcript not available.</p>
      ) : (
        <div
          className="max-h-56 overflow-y-auto text-sm leading-relaxed pr-1"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink-dim)' }}
        >
          {segments.map((s, i) => (
            <span key={i}>{s.text} </span>
          ))}
        </div>
      )}
    </Card>
  )
}

function ScoreCard({ feedback }: { feedback: ReviewQuestion['feedback'] }) {
  const combined = feedback?.combinedScore ?? null
  const accounting = feedback?.accountingScore ?? null
  const consulting = feedback?.consultingScore ?? null

  if (!feedback) {
    return (
      <Card>
        <p className="eyebrow mb-3">Score</p>
        <p className="text-sm text-[color:var(--ink-faint)]">No scores yet.</p>
      </Card>
    )
  }

  return (
    <Card>
      <p className="eyebrow mb-3">Score</p>
      {combined !== null && (
        <div className="flex items-center gap-3 mb-4">
          <Score value={combined} size="xl" />
          <span className="text-xs text-[color:var(--ink-faint)]">combined</span>
        </div>
      )}
      <div className="space-y-3">
        {accounting !== null && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[color:var(--ink-faint)]">Accounting</span>
              <Score value={accounting} size="sm" />
            </div>
            <Bar
              pct={(accounting / 10) * 100}
              accent={accounting >= 7.5 ? 'var(--good)' : accounting >= 5 ? 'var(--warn)' : 'var(--bad)'}
              aria-label={`Accounting score: ${accounting} out of 10`}
            />
          </div>
        )}
        {consulting !== null && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[color:var(--ink-faint)]">Consulting</span>
              <Score value={consulting} size="sm" />
            </div>
            <Bar
              pct={(consulting / 10) * 100}
              accent={consulting >= 7.5 ? 'var(--good)' : consulting >= 5 ? 'var(--warn)' : 'var(--bad)'}
              aria-label={`Consulting score: ${consulting} out of 10`}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

function FeedbackCard({ feedback }: { feedback: ReviewQuestion['feedback'] }) {
  if (!feedback) {
    return (
      <Card>
        <p className="eyebrow mb-3">Feedback</p>
        <p className="text-sm text-[color:var(--ink-faint)]">No feedback yet.</p>
      </Card>
    )
  }

  const items = parseFeedbackItems(feedback.items)

  return (
    <Card>
      <p className="eyebrow mb-3">Feedback</p>
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">No feedback items.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="eyebrow">{item.key}</p>
                {item.score !== undefined && (
                  <Score value={item.score} size="sm" />
                )}
              </div>
              {item.body && (
                <p className="text-sm text-[color:var(--ink-dim)] leading-relaxed">{item.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {feedback.whatYouNeedToLearn && (
        <blockquote
          className="mt-4 border-l-[3px] pl-4 py-1 text-sm leading-relaxed italic"
          style={{
            borderColor: 'var(--warn)',
            background: 'var(--warn-soft)',
            color: 'var(--ink-dim)',
            borderRadius: '0 4px 4px 0',
          }}
        >
          <p className="eyebrow not-italic mb-1">What you need to learn</p>
          {feedback.whatYouNeedToLearn}
        </blockquote>
      )}
    </Card>
  )
}

function AIChat({
  recordingId,
  questionId,
}: {
  recordingId: string
  questionId: string
}) {
  const [input, setInput] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAsk = useCallback(async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: { recordingId, questionId },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { reply?: string; message?: string }
      setReply(data.reply ?? data.message ?? '(no reply)')
      setInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [input, recordingId, questionId])

  return (
    <Card>
      <p className="eyebrow mb-3">Ask the AI tutor</p>
      <div
        role="status"
        aria-live="polite"
        className="mb-3"
      >
        {reply && (
          <p className="text-sm text-[color:var(--ink-dim)] leading-relaxed whitespace-pre-wrap">
            {reply}
          </p>
        )}
        {error && (
          <p className="text-sm text-[color:var(--bad)]">{error}</p>
        )}
      </div>
      {/* TODO(fidelity): upgrade to SSE streaming once OpenRouter streaming is confirmed */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleAsk() }}
          placeholder="Ask about this question…"
          aria-label="Chat message"
          disabled={loading}
          className="flex-1 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-1 disabled:opacity-50"
        />
        <Btn
          variant="primary"
          size="sm"
          onClick={() => void handleAsk()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? '…' : 'Ask'}
        </Btn>
      </div>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewClient({
  recording,
  questions,
}: {
  recording: ReviewRecording
  questions: ReviewQuestion[]
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [layout, setLayout] = useState<Layout>('split')

  const question = questions[activeIdx] ?? null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIdx > 0) setActiveIdx((i) => i - 1)
      if (e.key === 'ArrowRight' && activeIdx < questions.length - 1)
        setActiveIdx((i) => i + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIdx, questions.length])

  return (
    <div>
      <EyebrowHeading
        eyebrow="Review"
        title={recording.title ?? 'Session Review'}
        sub={formatDate(recording.createdAt)}
        right={
          <div className="flex items-center gap-1" role="group" aria-label="Layout toggle">
            <Btn
              variant={layout === 'split' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('split')}
              aria-pressed={layout === 'split'}
            >
              Split
            </Btn>
            <Btn
              variant={layout === 'stacked' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('stacked')}
              aria-pressed={layout === 'stacked'}
            >
              Stacked
            </Btn>
          </div>
        }
      />

      {questions.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">No questions found in this session.</p>
      ) : (
        <>
          <QuestionSelector
            questions={questions}
            activeIdx={activeIdx}
            onSelect={setActiveIdx}
          />

          {question !== null && (
            <>
              <div className="mb-3 flex items-center gap-2 text-xs text-[color:var(--ink-faint)]">
                <span>
                  Question {activeIdx + 1} of {questions.length}
                </span>
                {question.section && <SectionBadge section={question.section} size="xs" />}
                {question.topic && (
                  <span className="text-[color:var(--ink-dim)]">{question.topic.name}</span>
                )}
              </div>

              {layout === 'split' ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className="space-y-4">
                    <QuestionCard question={question} />
                    <TranscriptCard question={question} />
                    <AIChat recordingId={recording.id} questionId={question.id} />
                  </div>
                  <div className="space-y-4">
                    <ScoreCard feedback={question.feedback} />
                    <FeedbackCard feedback={question.feedback} />
                    {/* TODO(fidelity): add FlowchartCard using mermaid package — pnpm add mermaid */}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <QuestionCard question={question} />
                  <TranscriptCard question={question} />
                  <ScoreCard feedback={question.feedback} />
                  <FeedbackCard feedback={question.feedback} />
                  {/* TODO(fidelity): add FlowchartCard using mermaid package — pnpm add mermaid */}
                  <AIChat recordingId={recording.id} questionId={question.id} />
                </div>
              )}

              <nav
                className="mt-6 flex items-center justify-between text-sm"
                aria-label="Question navigation"
              >
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((i) => i - 1)}
                  aria-label="Previous question"
                >
                  ← Prev
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={activeIdx === questions.length - 1}
                  onClick={() => setActiveIdx((i) => i + 1)}
                  aria-label="Next question"
                >
                  Next →
                </Btn>
              </nav>
            </>
          )}
        </>
      )}
    </div>
  )
}
