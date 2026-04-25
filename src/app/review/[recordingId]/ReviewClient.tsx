'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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

type FeedbackItem = { key: string; score?: number; body?: string; provisional?: boolean }

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
    (i): i is { key: string; score?: number; body?: string; provisional?: boolean } =>
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

function formatSec(sec?: number): string {
  if (sec == null) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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
  const normalizedUserAnswer = extracted?.userAnswer?.trim().toUpperCase() ?? ''

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
            const isUserChoice =
              normalizedUserAnswer === label ||
              normalizedUserAnswer === choice.trim().toUpperCase()
            const isWrongUserChoice = isUserChoice && !isCorrect
            return (
              <li
                key={i}
                className="flex items-start gap-2 rounded px-3 py-2 text-sm"
                style={{
                  background: isCorrect
                    ? 'var(--good-soft)'
                    : isWrongUserChoice
                    ? 'var(--bad-soft)'
                    : 'var(--canvas-2)',
                  color: isCorrect ? 'var(--good)' : isWrongUserChoice ? 'var(--bad)' : 'var(--ink-dim)',
                  border: isCorrect
                    ? '1px solid var(--good)'
                    : isWrongUserChoice
                    ? '1px solid var(--bad)'
                    : '1px solid var(--border)',
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
            <p key={i} className="mb-2 flex gap-3">
              <button
                type="button"
                className="mono tabular text-[11px] text-[color:var(--accent)] hover:underline shrink-0"
                title={`Jump to ${formatSec(s.start)}`}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('servant:toast', {
                      detail: { message: `Transcript timestamp ${formatSec(s.start)}` },
                    }),
                  )
                }}
              >
                {formatSec(s.start)}
              </button>
              <span>{s.text}</span>
            </p>
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
                <div className="flex items-center gap-2">
                  <p className="eyebrow">{item.key}</p>
                  {item.provisional && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[color:var(--warn-soft)] text-[color:var(--warn)]">
                      provisional
                    </span>
                  )}
                </div>
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

function FlowchartCard({ question }: { question: ReviewQuestion }) {
  const feedback = question.feedback
  const items = parseFeedbackItems(feedback?.items)
  const extracted = (question.extracted ?? null) as ExtractedShape | null
  const gap =
    feedback?.whatYouNeedToLearn ??
    items.find((item) => /gap|learn|misstep/i.test(item.key))?.body ??
    'No first-misstep narrative was returned for this question.'
  const answerLine =
    extracted?.correctAnswer || extracted?.userAnswer
      ? `Your answer: ${extracted?.userAnswer ?? '-'} | Correct: ${extracted?.correctAnswer ?? '-'}`
      : 'Answer comparison pending.'

  const steps = [
    { label: 'Question', body: extracted?.question ?? 'Question extraction pending.', state: 'done' },
    { label: 'Your path', body: answerLine, state: extracted?.userAnswer === extracted?.correctAnswer ? 'done' : 'warn' },
    { label: 'First misstep', body: gap, state: feedback ? 'bad' : 'pending' },
    { label: 'Correct rule', body: extracted?.beckerExplanation ?? 'Source explanation pending.', state: extracted?.beckerExplanation ? 'done' : 'pending' },
    { label: 'Next action', body: question.topic ? `Review ${question.topic.name}.` : 'Link this question to a topic.', state: 'active' },
  ] as const

  return (
    <Card>
      <p className="eyebrow mb-3">Reasoning Flow</p>
      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const color =
            step.state === 'done'
              ? 'var(--good)'
              : step.state === 'bad'
                ? 'var(--bad)'
                : step.state === 'warn'
                  ? 'var(--warn)'
                  : step.state === 'active'
                    ? 'var(--accent)'
                    : 'var(--ink-faint)'

          return (
            <li key={step.label} className="grid grid-cols-[24px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono text-white"
                  style={{ background: color }}
                >
                  {idx + 1}
                </span>
                {idx < steps.length - 1 && (
                  <span className="mt-1 h-full min-h-6 w-px bg-[color:var(--border)]" aria-hidden="true" />
                )}
              </div>
              <div className="rounded border border-[color:var(--border)] bg-[color:var(--canvas-2)] px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink)]">
                    {step.label}
                  </p>
                  {idx === 3 && extracted?.beckerExplanation && (
                    <a href="#sources-card" className="text-[10px] font-mono text-[color:var(--accent)] hover:underline">
                      source
                    </a>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-[color:var(--ink-dim)]">{step.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function SourcesCard({ question }: { question: ReviewQuestion }) {
  const extracted = (question.extracted ?? null) as ExtractedShape | null
  const sources = [
    extracted?.beckerExplanation
      ? {
          id: 'becker',
          label: 'Question explanation',
          ref: extracted.section ?? question.section ?? 'CPA',
          relevance: 92,
          passage: extracted.beckerExplanation,
        }
      : null,
    question.topic
      ? {
          id: 'topic',
          label: 'Linked topic',
          ref: question.topic.section,
          relevance: 76,
          passage: question.topic.name,
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; ref: string; relevance: number; passage: string }>

  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? '')
  const selected = sources.find((source) => source.id === selectedId) ?? sources[0]

  return (
    <Card id="sources-card">
      <p className="eyebrow mb-3">Sources</p>
      {sources.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-faint)]">No sources attached to this question yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <div className="space-y-1">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedId(source.id)}
                className="w-full rounded border px-3 py-2 text-left text-xs hover:border-[color:var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                style={{
                  borderColor: selected?.id === source.id ? 'var(--accent)' : 'var(--border)',
                  background: selected?.id === source.id ? 'var(--accent-faint)' : 'var(--surface)',
                }}
              >
                <span className="block font-semibold text-[color:var(--ink)]">{source.label}</span>
                <span className="mt-1 block mono tabular text-[color:var(--ink-faint)]">
                  {source.ref} | {source.relevance}%
                </span>
              </button>
            ))}
          </div>
          <div className="rounded border-l-[3px] border-[color:var(--accent)] bg-[color:var(--canvas-2)] px-4 py-3">
            <p className="text-sm leading-relaxed text-[color:var(--ink-dim)]">{selected?.passage}</p>
          </div>
        </div>
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
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAsk = useCallback(async () => {
    if (!input.trim()) return
    const message = input.trim()
    setLoading(true)
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: { recordingId, questionId },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { reply?: string; message?: string }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? data.message ?? '(no reply)' },
      ])
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
        className="mb-3 space-y-2"
      >
        {messages.map((message, idx) => (
          <div
            key={idx}
            className="rounded border border-[color:var(--border)] bg-[color:var(--canvas-2)] px-3 py-2"
          >
            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[color:var(--ink-faint)]">
              {message.role === 'user' ? 'You' : 'Tutor'}
            </p>
            <p className="text-sm text-[color:var(--ink-dim)] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        ))}
        {error && (
          <p className="text-sm text-[color:var(--bad)]">{error}</p>
        )}
      </div>
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
          <div className="flex items-center gap-2">
            <Link href="/review" tabIndex={-1}>
              <Btn variant="ghost" size="sm">All recordings</Btn>
            </Link>
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
                    <FlowchartCard question={question} />
                    <SourcesCard question={question} />
                    <AIChat recordingId={recording.id} questionId={question.id} />
                  </div>
                  <div className="space-y-4">
                    <ScoreCard feedback={question.feedback} />
                    <FeedbackCard feedback={question.feedback} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <QuestionCard question={question} />
                  <TranscriptCard question={question} />
                  <ScoreCard feedback={question.feedback} />
                  <FeedbackCard feedback={question.feedback} />
                  <FlowchartCard question={question} />
                  <SourcesCard question={question} />
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
