'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EyebrowHeading, Tabs, Card, Bar, Score, SectionBadge, Btn } from '@/components/ui'
import { usePipelineStatus } from '@/hooks/usePipelineStatus'
import { useRecordings } from '@/hooks/useRecordings'
import { isActiveCpaSection } from '@/lib/cpa-sections'

const STAGES = [
  'uploading',
  'segmenting',
  'extracting',
  'transcribing',
  'tagging',
  'grading',
] as const

type Stage = (typeof STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  uploading: 'Upload',
  segmenting: 'Segment',
  extracting: 'Extract',
  transcribing: 'Transcribe',
  tagging: 'Tag',
  grading: 'Grade',
}

type StageProgressItem = {
  stage: string
  pct: number
  etaSec: number | null
  message: string
  updatedAt: string
}

type PipelineQuestion = {
  id: string
  status: string
  section: string | null
  feedback: { combinedScore: number } | null
}

type PipelineRecording = {
  id: string
  status: string
  title: string | null
  sections: string[]
  modelUsed: string | null
  durationSec: number | null
  segmentsCount: number | null
  createdAt: string
  _count: { questions: number }
  progress: StageProgressItem[]
  questions: PipelineQuestion[]
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60_000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDuration(sec: number | null): string {
  if (!sec) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatEta(sec: number | null): string | null {
  if (sec == null) return null
  if (sec < 60) return `${Math.max(1, Math.round(sec))}s`
  const minutes = Math.round(sec / 60)
  return `${minutes}m`
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'done': return 'var(--good)'
    case 'failed': return 'var(--bad)'
    case 'uploading':
    case 'uploaded':
    case 'segmenting':
    case 'processing_questions': return 'var(--warn)'
    default: return 'var(--ink-faint)'
  }
}

function latestProgress(recording: PipelineRecording): StageProgressItem | null {
  return recording.progress.at(-1) ?? null
}

function progressFor(recording: PipelineRecording, stage: Stage): StageProgressItem | null {
  for (let i = recording.progress.length - 1; i >= 0; i -= 1) {
    const item = recording.progress[i]
    if (item?.stage === stage) return item
  }
  return null
}

function activeStageIndex(recording: PipelineRecording): number {
  if (recording.status === 'done') return STAGES.length - 1
  const latest = latestProgress(recording)
  if (latest && STAGES.includes(latest.stage as Stage)) {
    return STAGES.indexOf(latest.stage as Stage)
  }
  switch (recording.status) {
    case 'uploading':
    case 'uploaded': return 0
    case 'segmenting': return 1
    case 'processing_questions': return 2
    default: return -1
  }
}

function averageScore(questions: PipelineQuestion[]): number | null {
  const scores = questions
    .map((q) => q.feedback?.combinedScore)
    .filter((score): score is number => score != null)
  if (scores.length === 0) return null
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
}

function sectionsFor(recording: PipelineRecording): string[] {
  const fromRecording = (recording.sections ?? []).filter(isActiveCpaSection)
  if (fromRecording.length > 0) return fromRecording
  return Array.from(new Set(recording.questions.map((q) => q.section).filter(isActiveCpaSection)))
}

function StageDot({ state }: { state: 'done' | 'active' | 'pending' | 'failed' }) {
  const color =
    state === 'done'
      ? 'var(--good)'
      : state === 'failed'
        ? 'var(--bad)'
        : state === 'active'
          ? 'var(--accent)'
          : 'var(--canvas)'

  return (
    <span
      className={[
        'w-2.5 h-2.5 rounded-full shrink-0',
        state === 'active' ? 'animate-pulse' : '',
        state === 'pending' ? 'border border-[color:var(--border)]' : '',
      ].join(' ')}
      style={{ background: color }}
      aria-hidden="true"
    />
  )
}

function QuestionMiniGrid({ questions }: { questions: PipelineQuestion[] }) {
  if (questions.length === 0) {
    return (
      <p className="mt-4 text-xs text-[color:var(--ink-faint)]">
        Question grid appears after segmentation starts.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <p className="eyebrow mb-2">Questions</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-1" aria-label="Per-question progress">
        {questions.map((q, idx) => {
          const score = q.feedback?.combinedScore
          const color =
            q.status === 'failed'
              ? 'var(--bad)'
              : score != null
                ? score >= 7.5
                  ? 'var(--good)'
                  : score >= 5
                    ? 'var(--warn)'
                    : 'var(--bad)'
                : q.status === 'done'
                  ? 'var(--good)'
                  : q.status === 'pending'
                    ? 'var(--track)'
                    : 'var(--accent)'

          return (
            <span
              key={q.id}
              title={`Question ${idx + 1}: ${q.status}${score != null ? `, ${score.toFixed(1)}/10` : ''}`}
              className="h-[18px] rounded-[3px] border border-[color:var(--border)]"
              style={{ background: color }}
              aria-label={`Question ${idx + 1}: ${q.status}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function PipelineCard({ recording }: { recording: PipelineRecording }) {
  const activeIdx = activeStageIndex(recording)
  const latest = latestProgress(recording)
  const latestEta = formatEta(latest?.etaSec ?? null)
  const displaySections = sectionsFor(recording)
  const questionCount = recording.segmentsCount ?? recording._count.questions

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {displaySections.map((section) => (
              <SectionBadge key={section} section={section} size="xs" />
            ))}
            <span className="text-sm font-medium text-[color:var(--ink)]">
              {recording.title ?? recording.id.slice(0, 12)}
            </span>
            <span
              className="text-[10px] mono tabular px-1.5 py-0.5 rounded border"
              style={{
                color: statusDotColor(recording.status),
                borderColor: statusDotColor(recording.status),
                background: 'var(--surface)',
              }}
            >
              {recording.status}
            </span>
          </div>
          <span className="text-[11px] text-[color:var(--ink-faint)]">
            Started {relTime(recording.createdAt)}
            {questionCount > 0 ? ` | ${questionCount} questions` : ''}
            {latestEta ? ` | ETA ${latestEta}` : ''}
          </span>
          {latest?.message && (
            <span className="text-xs text-[color:var(--ink-dim)]">{latest.message}</span>
          )}
        </div>
        <Link href={`/recordings/${recording.id}/status`} tabIndex={-1}>
          <Btn variant="ghost" size="sm">Preview</Btn>
        </Link>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}
        role="list"
        aria-label="Processing stages"
      >
        {STAGES.map((stage, idx) => {
          const stageProgress = progressFor(recording, stage)
          const pct =
            recording.status === 'done'
              ? 100
              : stageProgress?.pct ?? (idx < activeIdx ? 100 : idx === activeIdx ? 35 : 0)

          const state: 'done' | 'active' | 'pending' | 'failed' =
            recording.status === 'failed' && idx === activeIdx
              ? 'failed'
              : recording.status === 'done' || pct >= 100 || idx < activeIdx
                ? 'done'
                : idx === activeIdx
                  ? 'active'
                  : 'pending'

          const accent =
            state === 'failed'
              ? 'var(--bad)'
              : state === 'done'
                ? 'var(--good)'
                : 'var(--accent)'

          return (
            <div
              key={stage}
              role="listitem"
              className="flex flex-col gap-1 items-center min-w-0"
              aria-label={`Stage: ${STAGE_LABELS[stage]}, ${state}`}
            >
              <StageDot state={state} />
              <span
                className="text-[9px] font-mono uppercase tracking-wide text-center leading-tight"
                style={{ color: state === 'pending' ? 'var(--ink-faint)' : 'var(--ink-dim)' }}
              >
                {STAGE_LABELS[stage]}
              </span>
              <Bar
                pct={pct}
                height={3}
                accent={accent}
                aria-label={`${STAGE_LABELS[stage]} progress: ${Math.round(pct)}%`}
              />
            </div>
          )
        })}
      </div>

      <QuestionMiniGrid questions={recording.questions} />

      {recording.progress.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]">
            Stage log
          </summary>
          <ol className="mt-2 space-y-1 text-xs text-[color:var(--ink-dim)]">
            {recording.progress.slice().reverse().map((item, idx) => (
              <li key={`${item.stage}-${item.updatedAt}-${idx}`} className="flex items-start gap-2">
                <span className="mono text-[color:var(--ink-faint)] w-20 shrink-0">
                  {STAGE_LABELS[item.stage as Stage] ?? item.stage}
                </span>
                <span className="mono tabular w-10 shrink-0">{Math.round(item.pct)}%</span>
                <span>{item.message}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </Card>
  )
}

function PreviousTable({ recordings }: { recordings: PipelineRecording[] }) {
  if (recordings.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[color:var(--ink-faint)]" role="status">
        No completed recordings yet.
      </div>
    )
  }

  return (
    <Card pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="Previous recordings">
          <thead>
            <tr className="border-b border-[color:var(--border)] text-[color:var(--ink-faint)]">
              {['SECT', 'TITLE', 'WHEN', 'QUESTIONS', 'DURATION', 'AVG SCORE', 'MODEL'].map((col) => (
                <th key={col} className="px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec, i) => {
              const score = averageScore(rec.questions)
              const displaySections = sectionsFor(rec)
              return (
                <tr
                  key={rec.id}
                  className={i < recordings.length - 1 ? 'border-b border-[color:var(--border)]' : ''}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {displaySections.length > 0 ? (
                        displaySections.map((section) => (
                          <SectionBadge key={section} section={section} size="xs" />
                        ))
                      ) : (
                        <span className="text-[color:var(--ink-faint)]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/review/${rec.id}`}
                      className="text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] rounded text-[color:var(--ink)]"
                    >
                      {rec.title ?? rec.id.slice(0, 12)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--ink-faint)]">{relTime(rec.createdAt)}</td>
                  <td className="px-4 py-3 text-right mono tabular text-[color:var(--ink-dim)]">
                    {rec.segmentsCount ?? rec._count.questions}
                  </td>
                  <td className="px-4 py-3 text-right mono tabular text-[color:var(--ink-dim)]">
                    {formatDuration(rec.durationSec)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {score == null ? (
                      <span className="text-[color:var(--ink-faint)]">-</span>
                    ) : (
                      <Score value={score} size="sm" suffix="" />
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate text-[color:var(--ink-faint)]">
                    {rec.modelUsed ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function PipelineClient() {
  const [tab, setTab] = useState<'processing' | 'previous'>('processing')

  const { data: pipelineData, isLoading: pipelineLoading } = usePipelineStatus()
  const { data: recordingsData, isLoading: recordingsLoading } = useRecordings({ limit: 50 })

  const processingRecordings = useMemo(
    () => ((pipelineData?.items ?? []) as PipelineRecording[]),
    [pipelineData?.items],
  )
  const previousRecordings = useMemo(
    () =>
      (((recordingsData?.items ?? []) as PipelineRecording[]).filter(
        (r) => r.status === 'done' || r.status === 'failed',
      )),
    [recordingsData?.items],
  )

  const processingCount = processingRecordings.length

  return (
    <div className="flex flex-col gap-6">
      <EyebrowHeading
        eyebrow="PIPELINE"
        title="Recordings"
        sub="Live processing on top, completed below. Each card tracks segmentation, transcription, tagging, and grading independently."
        right={
          processingCount > 0 ? (
            <span
              className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-mono font-semibold text-white"
              style={{ background: 'var(--accent)' }}
              aria-label={`${processingCount} recordings processing`}
            >
              {processingCount}
            </span>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={(id) => setTab(id as 'processing' | 'previous')}
        items={[
          { id: 'processing', label: 'Processing', badge: processingCount },
          { id: 'previous', label: 'Previous', badge: previousRecordings.length },
        ]}
      />

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'processing' && (
          <>
            {pipelineLoading ? (
              <div className="py-12 text-center text-sm text-[color:var(--ink-faint)]" role="status" aria-live="polite">
                Loading...
              </div>
            ) : processingRecordings.length === 0 ? (
              <div className="py-12 text-center text-sm text-[color:var(--ink-faint)]" role="status" aria-live="polite">
                No recordings processing.
              </div>
            ) : (
              <div className="flex flex-col gap-3" role="list" aria-label="Processing recordings">
                {processingRecordings.map((rec) => (
                  <div key={rec.id} role="listitem">
                    <PipelineCard recording={rec} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'previous' && (
          <>
            {recordingsLoading ? (
              <div className="py-12 text-center text-sm text-[color:var(--ink-faint)]" role="status" aria-live="polite">
                Loading...
              </div>
            ) : (
              <PreviousTable recordings={previousRecordings} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
