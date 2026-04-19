'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EyebrowHeading, Tabs, Card, Bar, Score } from '@/components/ui'
import { usePipelineStatus } from '@/hooks/usePipelineStatus'
import { useRecordings } from '@/hooks/useRecordings'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES = [
  'uploading',
  'segmenting',
  'extracting',
  'transcribing',
  'tagging',
  'grading',
] as const

type Stage = (typeof STAGES)[number]

// Map recording.status → active stage index
function activeStageIndex(status: string): number {
  switch (status) {
    case 'uploading': return 0
    case 'uploaded': return 0
    case 'segmenting': return 1
    case 'processing_questions': return 2
    default: return -1
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'done': return 'var(--good)'
    case 'failed': return 'var(--bad)'
    case 'uploading':
    case 'segmenting':
    case 'processing_questions': return 'var(--warn)'
    default: return 'var(--ink-faint)'
  }
}

// ---------------------------------------------------------------------------
// Stage label display
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<Stage, string> = {
  uploading: 'Upload',
  segmenting: 'Segment',
  extracting: 'Extract',
  transcribing: 'Transcribe',
  tagging: 'Tag',
  grading: 'Grade',
}

// ---------------------------------------------------------------------------
// PipelineCard
// ---------------------------------------------------------------------------

interface PipelineRecording {
  id: string
  status: string
  durationSec: number | null
  createdAt: string
  _count: { questions: number }
}

interface PipelineCardProps {
  recording: PipelineRecording
}

function StageDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: 'var(--good)' }}
        aria-hidden="true"
      />
    )
  }
  if (state === 'active') {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
        style={{ background: 'var(--accent)' }}
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 border border-[color:var(--border)]"
      style={{ background: 'var(--canvas)' }}
      aria-hidden="true"
    />
  )
}

function PipelineCard({ recording }: PipelineCardProps) {
  const activeIdx = activeStageIndex(recording.status)
  const isFailed = recording.status === 'failed'
  const isDone = recording.status === 'done'

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-medium mono"
              style={{ color: 'var(--ink)' }}
            >
              {recording.id.slice(0, 12)}
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
          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            Started {relTime(recording.createdAt)}
            {recording._count.questions > 0 &&
              ` · ${recording._count.questions} questions`}
          </span>
        </div>
      </div>

      {/* Stage stepper */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}
        role="list"
        aria-label="Processing stages"
      >
        {STAGES.map((stage, idx) => {
          const state: 'done' | 'active' | 'pending' = isDone
            ? 'done'
            : isFailed && idx === activeIdx
            ? 'done' // treat last-processed as done on failure; the card itself shows failed
            : idx < activeIdx
            ? 'done'
            : idx === activeIdx
            ? 'active'
            : 'pending'

          const barPct =
            state === 'done' ? 100 : state === 'active' ? 50 : 0
          const barAccent =
            state === 'done'
              ? 'var(--good)'
              : isFailed && idx === activeIdx
              ? 'var(--bad)'
              : 'var(--accent)'

          return (
            <div
              key={stage}
              role="listitem"
              className="flex flex-col gap-1 items-center"
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
                pct={barPct}
                height={3}
                accent={barAccent}
                aria-label={`${STAGE_LABELS[stage]} progress: ${barPct}%`}
              />
            </div>
          )
        })}
      </div>

      {/* TODO: Per-question mini-grid — requires /api/recordings/[id]?include=questions endpoint */}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Previous recordings table
// ---------------------------------------------------------------------------

interface PreviousRecording {
  id: string
  status: string
  durationSec: number | null
  createdAt: string
  _count: { questions: number }
}

function PreviousTable({ recordings }: { recordings: PreviousRecording[] }) {
  if (recordings.length === 0) {
    return (
      <div
        className="py-12 text-center text-sm"
        style={{ color: 'var(--ink-faint)' }}
        role="status"
      >
        No completed recordings yet.
      </div>
    )
  }

  return (
    <Card pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="Previous recordings">
          <thead>
            <tr
              className="border-b border-[color:var(--border)]"
              style={{ color: 'var(--ink-faint)' }}
            >
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-2.5 text-right font-medium uppercase tracking-wider">
                Questions
              </th>
              <th className="px-4 py-2.5 text-right font-medium uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                Model
              </th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec, i) => (
              <tr
                key={rec.id}
                className={i < recordings.length - 1 ? 'border-b border-[color:var(--border)]' : ''}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/review/${rec.id}`}
                    className="text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] rounded"
                    style={{ color: 'var(--ink)' }}
                  >
                    {rec.id.slice(0, 12)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="flex items-center gap-1.5"
                    aria-label={`Status: ${rec.status}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: statusDotColor(rec.status) }}
                      aria-hidden="true"
                    />
                    <span className="mono text-[10px]" style={{ color: 'var(--ink-dim)' }}>
                      {rec.status}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-faint)' }}>
                  {relTime(rec.createdAt)}
                </td>
                <td className="px-4 py-3 text-right mono tabular" style={{ color: 'var(--ink-dim)' }}>
                  {rec._count.questions}
                </td>
                <td className="px-4 py-3 text-right">
                  <Score value={0} size="sm" suffix="" />
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-faint)' }}>
                  —
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function PipelineClient() {
  const [tab, setTab] = useState<'processing' | 'previous'>('processing')

  const { data: pipelineData, isLoading: pipelineLoading } = usePipelineStatus()
  const { data: recordingsData, isLoading: recordingsLoading } = useRecordings({ limit: 50 })

  const processingRecordings = pipelineData?.items ?? []
  const processingCount = processingRecordings.length

  const previousRecordings = (recordingsData?.items ?? []).filter(
    (r) => r.status === 'done' || r.status === 'failed',
  )

  return (
    <div className="flex flex-col gap-6">
      <EyebrowHeading
        eyebrow="Pipeline"
        title="Processing"
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
          { id: 'previous', label: 'Previous' },
        ]}
      />

      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'processing' && (
          <>
            {pipelineLoading ? (
              <div
                className="py-12 text-center text-sm"
                style={{ color: 'var(--ink-faint)' }}
                role="status"
                aria-live="polite"
              >
                Loading...
              </div>
            ) : processingRecordings.length === 0 ? (
              <div
                className="py-12 text-center text-sm"
                style={{ color: 'var(--ink-faint)' }}
                role="status"
                aria-live="polite"
              >
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
              <div
                className="py-12 text-center text-sm"
                style={{ color: 'var(--ink-faint)' }}
                role="status"
                aria-live="polite"
              >
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
