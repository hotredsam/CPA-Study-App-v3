'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { EyebrowHeading, Btn, Card, SectionBadge, Bar } from '@/components/ui'
import { ACTIVE_CPA_SECTIONS, CPA_SECTION_META } from '@/lib/cpa-sections'
import { clampPercent } from '@/lib/percent'
import type { ParsedBlock, ParsedRoutine } from '@/lib/routine/xml-parser'

interface StudyStats {
  totalHours: number
  weekHours: number
  streak: number
  recordingsCount: number
  processingCount?: number
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
  routine: ParsedRoutine | null
}

const EXAM_DEFAULTS: Record<string, string | null> = {
  FAR: null,
  REG: null,
  AUD: null,
  TCP: null,
  BAR: null,
  ISC: null,
}

const EMPTY_ROUTINE: ParsedRoutine = { morning: [], midday: [], evening: [] }


function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function statBar(pct: number, hue?: number) {
  return <Bar pct={clampPercent(pct)} height={3} accent={hue ? `oklch(0.50 0.12 ${hue})` : 'var(--accent)'} />
}

function Stat({ label, value, unit, bar }: { label: string; value: string | number; unit?: string; bar?: number }) {
  return (
    <Card>
      <div className="eyebrow">{label}</div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="mono tabular text-[28px] font-medium leading-none tracking-[-0.03em] text-[color:var(--ink)]">
          {value}
        </span>
        {unit && <span className="mono text-[11px] text-[color:var(--ink-faint)]">{unit}</span>}
      </div>
      {bar != null && <div className="mt-2.5">{statBar(bar)}</div>}
    </Card>
  )
}

function FocusStat({ label, value, sub, bar }: { label: string; value: string | number; sub?: string; bar?: number }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="mono tabular text-[22px] font-medium tracking-[-0.02em] text-[color:var(--ink)]">{value}</span>
        {sub && <span className="mono text-[11px] text-[color:var(--ink-faint)]">{sub}</span>}
      </div>
      {bar != null && <div className="mt-1.5">{statBar(bar)}</div>}
    </div>
  )
}

function SectionCard({ data }: { data: SectionData }) {
  const meta = CPA_SECTION_META[data.section as keyof typeof CPA_SECTION_META]
  const due = data.examDate ?? EXAM_DEFAULTS[data.section] ?? null
  const days = daysUntil(due)
  const hue = meta?.hue ?? 0
  const mastery = clampPercent(data.mastery)
  const unitsDone = Math.max(0, Math.round((mastery / 100) * Math.max(data.topicCount, 1)))
  const unitsTotal = Math.max(data.topicCount, 1)

  return (
    <Card accent={`oklch(0.55 0.10 ${hue})`}>
      <div className="flex items-start justify-between gap-3">
        <SectionBadge section={data.section} size="md" />
        <div className="text-right">
          <div className="mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">Exam</div>
          <div
            className="mono tabular text-xs"
            style={{ color: days == null ? 'var(--ink-faint)' : days < 60 ? 'var(--bad)' : 'var(--ink-dim)' }}
          >
            {days == null ? 'TBD' : `${days}d - ${fmtDate(due!)}`}
          </div>
        </div>
      </div>
      <div className="mt-3 text-[13px] font-medium text-[color:var(--ink)]">{meta?.name ?? data.section}</div>
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <FocusStat label="Hours" value={data.hoursStudied.toFixed(1)} />
        <FocusStat label="Progress" value={`${mastery}%`} />
      </div>
      <div className="mt-3">
        <div className="mono mb-1 text-[11px] text-[color:var(--ink-dim)]">
          {unitsDone}/{unitsTotal} units
        </div>
        {statBar(mastery, hue)}
      </div>
    </Card>
  )
}

function labelForBlock(block: ParsedBlock): string {
  const tasks = Array.isArray(block.task) ? block.task : block.task ? [block.task] : []
  const first = tasks[0]
  if (first?.unit || first?.chapter) return [first.section, first.unit, first.chapter].filter(Boolean).join(' - ')
  return block.type ? `${block.type} block` : 'Study block'
}

function tasksFor(block: ParsedBlock) {
  return Array.isArray(block.task) ? block.task : block.task ? [block.task] : []
}

function parseMinutes(time: string | undefined): number | null {
  if (!time) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function currentMinuteOfDay(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function focusFromRoutine(routine: ParsedRoutine): {
  active: boolean
  status: string
  section: string | null
  title: string
  detail: string
} {
  const blocks = [
    ...routine.morning.map((block) => ({ block, period: 'morning' })),
    ...routine.midday.map((block) => ({ block, period: 'midday' })),
    ...routine.evening.map((block) => ({ block, period: 'evening' })),
  ]
    .map((entry, index) => {
      const start = parseMinutes(entry.block.time)
      const duration = entry.block.duration ?? 0
      return { ...entry, index, start, end: start == null ? null : start + duration }
    })
    .sort((a, b) => (a.start ?? 10_000 + a.index) - (b.start ?? 10_000 + b.index))

  if (blocks.length === 0) {
    return {
      active: false,
      status: 'NOT SCHEDULED',
      section: null,
      title: 'No current focus scheduled',
      detail: 'Create a study routine or upload a textbook to start building today\'s plan.',
    }
  }

  const now = currentMinuteOfDay()
  const current = blocks.find((entry) => (
    entry.start != null && entry.end != null && now >= entry.start && now < entry.end
  ))
  const target = current ?? blocks.find((entry) => entry.start != null && entry.start >= now) ?? blocks[0]!
  const task = tasksFor(target.block)[0]
  const duration = target.block.duration ? `${target.block.duration}m` : null
  const time = target.block.time ?? target.period
  const type = target.block.type ?? 'study'

  return {
    active: Boolean(current),
    status: current ? 'IN PROGRESS' : 'UP NEXT',
    section: task?.section ?? null,
    title: labelForBlock(target.block),
    detail: [current ? 'Current' : 'Next', type, 'block', time ? `at ${time}` : null, duration ? `for ${duration}` : null]
      .filter(Boolean)
      .join(' '),
  }
}

function RoutineBlock({ label, blocks }: { label: string; blocks: ParsedBlock[] }) {
  return (
    <Card pad={false}>
      <div className="flex items-baseline justify-between border-b border-[color:var(--border)] px-4 py-3">
        <div>
          <div className="text-sm font-medium text-[color:var(--ink)]">{label}</div>
          <div className="mono mt-0.5 text-[11px] text-[color:var(--ink-faint)]">{blocks.length} task blocks</div>
        </div>
      </div>
      <div>
        {blocks.length === 0 ? (
          <div className="px-4 py-3 text-xs text-[color:var(--ink-faint)]">No tasks scheduled.</div>
        ) : (
          blocks.map((block, i) => (
            <div
              key={`${label}-${i}`}
              className={i === blocks.length - 1 ? 'grid items-center gap-2 px-3.5 py-2.5' : 'grid items-center gap-2 border-b border-[color:var(--border)] px-3.5 py-2.5'}
              style={{ gridTemplateColumns: '44px 1fr auto' }}
            >
              <div className="mono tabular text-[11px] text-[color:var(--ink-dim)]">{block.time ?? '--:--'}</div>
              <div className="min-w-0">
                <div className="truncate text-xs text-[color:var(--ink)]">{labelForBlock(block)}</div>
                <div className="mono mt-0.5 text-[10px] uppercase tracking-[0.06em] text-[color:var(--ink-faint)]">
                  {block.type ?? 'study'}
                </div>
              </div>
              <div className="mono tabular text-[11px] text-[color:var(--ink-faint)]">{block.duration ?? 0}m</div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function RoutineSection() {
  const { data, isLoading } = useQuery<ParsedRoutine>({
    queryKey: ['study-routine-today'],
    queryFn: async () => {
      const res = await fetch('/api/study-routine/today')
      if (!res.ok) return { morning: [], midday: [], evening: [] }
      return res.json() as Promise<ParsedRoutine>
    },
  })

  if (isLoading) return null
  const routine = data ?? { morning: [], midday: [], evening: [] }
  const totalTasks = routine.morning.length + routine.midday.length + routine.evening.length
  const totalMinutes = [...routine.morning, ...routine.midday, ...routine.evening].reduce((sum, block) => sum + (block.duration ?? 0), 0)

  return (
    <section aria-label="Today from study routine">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">TODAY - FROM study-routine.xml</div>
          <div className="mt-0.5 text-sm text-[color:var(--ink)]">
            {totalTasks} task blocks - {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m scheduled
          </div>
        </div>
        <Link href="/settings?tab=study" tabIndex={-1}>
          <Btn variant="subtle" size="sm">Edit routine</Btn>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        <RoutineBlock label="Morning" blocks={routine.morning} />
        <RoutineBlock label="Midday" blocks={routine.midday} />
        <RoutineBlock label="Evening" blocks={routine.evening} />
      </div>
    </section>
  )
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { studyStats, sections, weakestTopics, recentRecordings, cardsDue } = data
  const { data: routineData, isLoading: routineLoading } = useQuery<ParsedRoutine>({
    queryKey: ['study-routine-today'],
    queryFn: async () => {
      const res = await fetch('/api/study-routine/today')
      if (!res.ok) return EMPTY_ROUTINE
      return res.json() as Promise<ParsedRoutine>
    },
    initialData: data.routine ?? EMPTY_ROUTINE,
    refetchInterval: 60_000,
  })
  const displayTotalHours = studyStats.totalHours
  const displayWeekHours = studyStats.weekHours
  const displayStreak = studyStats.streak
  const displayCardsDue = cardsDue > 0 ? cardsDue : 0
  const displayRecordingsCount = studyStats.recordingsCount
  const bySection = new Map(sections.map((section) => [section.section, section]))
  const sectionOrder = sections.length > 0 ? sections.map((section) => section.section) : [...ACTIVE_CPA_SECTIONS]
  const sectionRows: SectionData[] = sectionOrder.map((section) => bySection.get(section) ?? {
    section,
    hoursStudied: 0,
    mastery: 0,
    examDate: EXAM_DEFAULTS[section] ?? null,
    topicCount: 0,
  })
  const displaySectionRows = sectionRows
  const currentFocus = routineLoading
    ? {
        active: false,
        status: 'LOADING',
        section: null,
        title: 'Loading current focus',
        detail: 'Checking today\'s study routine.',
      }
    : focusFromRoutine(routineData ?? EMPTY_ROUTINE)
  const focusSection = currentFocus.section
    ? displaySectionRows.find((section) => section.section === currentFocus.section)
    : null
  const focusStats = focusSection ?? displaySectionRows[0] ?? {
    section: ACTIVE_CPA_SECTIONS[0],
    hoursStudied: 0,
    mastery: 0,
    examDate: null,
    topicCount: 0,
  }
  const focusHue = CPA_SECTION_META[(focusSection?.section ?? displaySectionRows[0]?.section ?? 'FAR') as keyof typeof CPA_SECTION_META]?.hue ?? CPA_SECTION_META.FAR.hue
  const focusMastery = clampPercent(focusStats.mastery)
  const totalTarget = 1200
  const totalPct = clampPercent((displayTotalHours / totalTarget) * 100)

  return (
    <div className="flex flex-col gap-5">
      <EyebrowHeading
        eyebrow={`DASHBOARD - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        title={`${displayTotalHours.toFixed(1)} hours in, ${displayWeekHours.toFixed(1)} this week, on pace.`}
        sub={`${currentFocus.section ? `${currentFocus.section}: ` : ''}${currentFocus.title}. Anki has ${displayCardsDue} reviews due. ${studyStats.processingCount ?? 0} recordings processing in the background.`}
        right={
          <div className="flex gap-2">
            <Link href="/anki" tabIndex={-1}>
              <Btn variant="ghost">Anki - {displayCardsDue} due</Btn>
            </Link>
            <Link href="/record" tabIndex={-1}>
              <Btn variant="primary" size="lg">Record session</Btn>
            </Link>
          </div>
        }
      />

      <Card
        pad={false}
        style={{ background: `linear-gradient(180deg, oklch(0.70 0.06 ${focusHue} / 0.12) 0%, var(--surface) 70%)` }}
      >
        <div className="grid items-center gap-7 px-7 py-5 xl:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="eyebrow">CURRENT FOCUS - RIGHT NOW</span>
              <span className="mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--accent)]">{currentFocus.status}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3.5">
              {currentFocus.section && <SectionBadge section={currentFocus.section} size="lg" />}
              <div>
                <div className="text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-[color:var(--ink)]">
                  {currentFocus.title}
                </div>
                <div className="mt-1 text-sm text-[color:var(--ink-dim)]">
                  <span className="text-[color:var(--ink)]">{currentFocus.detail}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid max-w-[680px] grid-cols-2 gap-6 md:grid-cols-4">
              <FocusStat label="Unit progress" value={`${focusMastery}%`} bar={focusMastery} />
              <FocusStat label="Hours - unit" value={focusStats.hoursStudied.toFixed(1)} sub="hrs" />
              <FocusStat label="Topics - seen" value={focusStats.topicCount} />
              <FocusStat label="Cards - due" value={displayCardsDue} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/study" tabIndex={-1}>
              <Btn variant="primary" size="lg" className="w-full">Continue reading</Btn>
            </Link>
            <Link href="/anki" tabIndex={-1}>
              <Btn variant="ghost" className="w-full">Practice Anki - {displayCardsDue}</Btn>
            </Link>
            <Link href="/record" tabIndex={-1}>
              <Btn variant="ghost" className="w-full">Record drill</Btn>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="TOTAL HOURS" value={displayTotalHours.toFixed(1)} unit={`/ ${totalTarget}`} bar={totalPct} />
        <Stat label="THIS WEEK" value={displayWeekHours.toFixed(1)} unit="hrs of 35" bar={(displayWeekHours / 35) * 100} />
        <Stat label="STREAK" value={displayStreak} unit="days" />
        <Stat label="RECORDINGS" value={displayRecordingsCount} unit={`${studyStats.processingCount ?? 0} processing`} />
      </div>

      <section aria-label="Section progress">
        <div className="eyebrow mb-2.5">SECTIONS - HOURS, PROGRESS & DUE DATES</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {displaySectionRows.map((section) => (
            <SectionCard key={section.section} data={section} />
          ))}
        </div>
      </section>

      <RoutineSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <div className="border-b border-[color:var(--border)] px-4 py-3">
            <div className="eyebrow">WEAKEST TOPICS</div>
          </div>
          <div>
            {weakestTopics.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[color:var(--ink-faint)]">No topic history yet.</div>
            ) : (
              weakestTopics.map((topic, i) => (
                <Link
                  key={topic.id}
                  href={`/topics?topicId=${topic.id}`}
                  className={`grid items-center gap-3 px-4 py-3 hov ${i === weakestTopics.length - 1 ? '' : 'border-b border-[color:var(--border)]'}`}
                  style={{ gridTemplateColumns: '52px 1fr 64px' }}
                >
                  <SectionBadge section={topic.section} size="xs" />
                  <span className="truncate text-[13px] text-[color:var(--ink)]">{topic.name}</span>
                  <span className="mono tabular text-right text-xs" style={{ color: topic.errorRate >= 50 ? 'var(--bad)' : 'var(--warn)' }}>
                    {topic.errorRate}%
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card pad={false}>
          <div className="border-b border-[color:var(--border)] px-4 py-3">
            <div className="eyebrow">RECENT RECORDINGS</div>
          </div>
          <div>
            {recentRecordings.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[color:var(--ink-faint)]">No recordings yet.</div>
            ) : (
              recentRecordings.map((recording, i) => (
                <div
                  key={recording.id}
                  className={`grid items-center gap-3 px-4 py-3 ${i === recentRecordings.length - 1 ? '' : 'border-b border-[color:var(--border)]'}`}
                  style={{ gridTemplateColumns: '1fr auto' }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-[color:var(--ink)]">{recording.title ?? recording.id.slice(0, 12)}</div>
                    <div className="mono mt-0.5 text-[10px] text-[color:var(--ink-faint)]">
                      {relTime(recording.createdAt)}
                      {recording.segmentsCount != null ? ` - ${recording.segmentsCount} segments` : ''}
                    </div>
                  </div>
                  <span className="mono rounded-[2px] border border-[color:var(--border)] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] uppercase text-[color:var(--ink-dim)]">
                    {recording.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
