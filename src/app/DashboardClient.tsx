'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  EyebrowHeading,
  Btn,
  Card,
  SectionBadge,
  Bar,
  Score,
} from '@/components/ui'
import type { ParsedBlock, ParsedRoutine } from '@/lib/routine/xml-parser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudyStats {
  totalHours: number
  weekHours: number
  streak: number
  recordingsCount: number
}

interface SectionData {
  section: string
  hoursStudied: number
  mastery: number
  examDate: string | null
  topicCount: number
}

interface WeakTopic {
  id: string
  name: string
  section: string
  mastery: number
  errorRate: number
}

interface RecentRecording {
  id: string
  title: string | null
  createdAt: string
  status: string
  segmentsCount: number | null
}

export interface DashboardData {
  studyStats: StudyStats
  sections: SectionData[]
  weakestTopics: WeakTopic[]
  recentRecordings: RecentRecording[]
  cardsDue: number
  routine: null
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

function statusColor(status: string): string {
  switch (status) {
    case 'done': return 'var(--good)'
    case 'failed': return 'var(--bad)'
    default: return 'var(--warn)'
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatProps {
  label: string
  value: string | number
  sub?: string
}

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="mono tabular text-2xl font-semibold"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
        {label}
      </span>
      {sub && (
        <span className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

interface FocusStatProps {
  label: string
  value: string | number
  sub?: string
}

function FocusStat({ label, value, sub }: FocusStatProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="mono tabular text-xl font-semibold"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
        {label}
      </span>
      {sub && (
        <span className="text-[10px]" style={{ color: 'var(--ink-dim)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Today's schedule sub-component
// ---------------------------------------------------------------------------

function BlockPill({ block }: { block: ParsedBlock }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)]"
    >
      {block.time && (
        <span className="text-xs mono tabular shrink-0" style={{ color: 'var(--ink-faint)' }}>
          {block.time}
        </span>
      )}
      {block.duration != null && (
        <span className="text-xs mono tabular shrink-0" style={{ color: 'var(--ink-dim)' }}>
          {block.duration}m
        </span>
      )}
      {block.type && (
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'var(--accent-faint)', color: 'var(--accent)' }}
        >
          {block.type}
        </span>
      )}
    </div>
  )
}

interface PeriodRowProps {
  label: string
  blocks: ParsedBlock[]
}

function PeriodRow({ label, blocks }: PeriodRowProps) {
  if (blocks.length === 0) return null
  return (
    <div>
      <p className="eyebrow mb-2" style={{ color: 'var(--ink-faint)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {blocks.map((b, i) => (
          <BlockPill key={i} block={b} />
        ))}
      </div>
    </div>
  )
}

function TodaySchedule() {
  const { data, isLoading } = useQuery<ParsedRoutine>({
    queryKey: ['study-routine-today'],
    queryFn: async () => {
      const res = await fetch('/api/study-routine/today')
      if (!res.ok) return { morning: [], midday: [], evening: [] }
      return res.json() as Promise<ParsedRoutine>
    },
  })

  const hasBlocks =
    (data?.morning.length ?? 0) > 0 ||
    (data?.midday.length ?? 0) > 0 ||
    (data?.evening.length ?? 0) > 0

  if (isLoading) return null

  return (
    <section aria-label="Today's schedule">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Today&apos;s Schedule
          </h2>
          <Link href="/settings?tab=study" tabIndex={0}>
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              Edit
            </span>
          </Link>
        </div>

        {hasBlocks ? (
          <div className="flex flex-col gap-4">
            <PeriodRow label="Morning" blocks={data?.morning ?? []} />
            <PeriodRow label="Midday" blocks={data?.midday ?? []} />
            <PeriodRow label="Evening" blocks={data?.evening ?? []} />
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
            Set up your study schedule in{' '}
            <Link href="/settings?tab=study" style={{ color: 'var(--accent)' }}>
              Settings &rarr; Study tab
            </Link>
            .
          </p>
        )}
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface Props {
  data: DashboardData
}

export function DashboardClient({ data }: Props) {
  const { studyStats, sections, weakestTopics, recentRecordings, cardsDue } = data
  const hasSections = sections.length > 0
  const focusSection = hasSections ? sections[0] : null
  const isEmpty = studyStats.recordingsCount === 0 && sections.length === 0

  return (
    <div className="flex flex-col gap-6">
      <EyebrowHeading
        eyebrow="Dashboard"
        title="CPA Study Servant"
        right={
          <div className="flex gap-2">
            <Btn
              variant="ghost"
              size="sm"
              aria-label="Open Anki flashcard review"
            >
              Anki
            </Btn>
            <Link href="/record" tabIndex={-1}>
              <Btn variant="primary" size="sm" aria-label="Start a new recording session">
                Record
              </Btn>
            </Link>
          </div>
        }
      />

      {/* Empty state */}
      {isEmpty && (
        <div
          className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-base" style={{ color: 'var(--ink-dim)' }}>
            No recordings yet. Record your first session to get started.
          </p>
          <Link href="/record" tabIndex={-1}>
            <Btn variant="primary" size="lg" aria-label="Start recording">
              Record
            </Btn>
          </Link>
        </div>
      )}

      {/* Current focus card */}
      {focusSection && (
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <SectionBadge section={focusSection.section} size="md" />
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {focusSection.section} — Current Focus
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FocusStat label="Mastery" value={`${focusSection.mastery}%`} />
              <FocusStat label="Cards Due" value={cardsDue} />
              <FocusStat label="This Week" value={`${studyStats.weekHours}h`} />
              <FocusStat label="Topics" value={focusSection.topicCount} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="subtle" size="sm" aria-label="Continue reading current chapter">
                Continue reading
              </Btn>
              <Btn variant="subtle" size="sm" aria-label="Open Anki for practice">
                Practice Anki
              </Btn>
              <Link href="/record" tabIndex={-1}>
                <Btn variant="ghost" size="sm" aria-label="Record a drill session">
                  Record drill
                </Btn>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Stats row */}
      {!isEmpty && (
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat label="Total Hours" value={studyStats.totalHours} />
            <Stat label="This Week" value={`${studyStats.weekHours}h`} />
            <Stat label="Streak" value={`${studyStats.streak}d`} sub="consecutive days" />
            <Stat label="Recordings" value={studyStats.recordingsCount} />
          </div>
        </Card>
      )}

      {/* Today's Schedule */}
      <TodaySchedule />

      {/* Section cards */}
      {sections.length > 0 && (
        <section aria-label="Section progress">
          <h2
            className="eyebrow mb-3"
            style={{ color: 'var(--ink-faint)' }}
          >
            Sections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((sec) => (
              <Card key={sec.section}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <SectionBadge section={sec.section} size="sm" />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {sec.section}
                    </span>
                  </div>
                  {sec.examDate && (
                    <span
                      className="text-[11px] mono tabular shrink-0"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      {sec.examDate}
                    </span>
                  )}
                </div>
                <Bar
                  pct={sec.mastery}
                  height={6}
                  aria-label={`${sec.section} mastery: ${sec.mastery}%`}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs mono tabular" style={{ color: 'var(--ink-dim)' }}>
                    {sec.mastery}% mastery
                  </span>
                  <span className="text-xs mono tabular" style={{ color: 'var(--ink-faint)' }}>
                    {sec.hoursStudied}h
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weakest topics */}
        {weakestTopics.length > 0 && (
          <section aria-label="Weakest topics">
            <Card pad={false}>
              <div className="px-4 py-3 border-b border-[color:var(--border)]">
                <h2 className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  Weakest Topics
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr
                      className="border-b border-[color:var(--border)]"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      <th className="px-4 py-2 text-left font-medium uppercase tracking-wider">
                        Section
                      </th>
                      <th className="px-4 py-2 text-left font-medium uppercase tracking-wider">
                        Topic
                      </th>
                      <th className="px-4 py-2 text-right font-medium uppercase tracking-wider">
                        Mastery
                      </th>
                      <th className="px-4 py-2 text-right font-medium uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakestTopics.map((t, i) => (
                      <tr
                        key={t.id}
                        className={i < weakestTopics.length - 1 ? 'border-b border-[color:var(--border)]' : ''}
                      >
                        <td className="px-4 py-2">
                          <SectionBadge section={t.section} size="xs" />
                        </td>
                        <td className="px-4 py-2 max-w-[140px] truncate" style={{ color: 'var(--ink)' }}>
                          {t.name}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Score value={t.mastery / 10} size="sm" suffix="" />
                        </td>
                        <td
                          className="px-4 py-2 text-right mono tabular"
                          style={{ color: t.errorRate > 50 ? 'var(--bad)' : 'var(--ink-dim)' }}
                        >
                          {t.errorRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* Recent recordings */}
        {recentRecordings.length > 0 && (
          <section aria-label="Recent recordings">
            <Card pad={false}>
              <div className="px-4 py-3 border-b border-[color:var(--border)]">
                <h2 className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  Recent Recordings
                </h2>
              </div>
              <ul className="divide-y divide-[color:var(--border)]">
                {recentRecordings.map((rec) => (
                  <li key={rec.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-sm truncate"
                        style={{ color: 'var(--ink)' }}
                      >
                        {rec.title ?? rec.id.slice(0, 12)}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        {relTime(rec.createdAt)}
                        {rec.segmentsCount != null && ` · ${rec.segmentsCount} segments`}
                      </span>
                    </div>
                    <span
                      className="text-[10px] mono font-semibold px-2 py-0.5 rounded shrink-0"
                      style={{
                        color: statusColor(rec.status),
                        background: 'var(--surface-2)',
                        border: `1px solid ${statusColor(rec.status)}`,
                      }}
                    >
                      {rec.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
