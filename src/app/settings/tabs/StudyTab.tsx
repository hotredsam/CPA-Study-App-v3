'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'
import {
  ACTIVE_CPA_SECTIONS,
  CPA_SECTION_META,
  DISCIPLINE_CPA_SECTIONS,
  MANDATORY_CPA_SECTIONS,
  type CpaSectionCode,
  type DisciplineCpaSection,
} from '@/lib/cpa-sections'

type ExamDates = Partial<Record<CpaSectionCode, string>>

interface HoursTarget {
  daily?: number
  weekly?: number
  total?: number
}

interface StudyRoutine {
  id: string
  xmlSource: string
  examDates: ExamDates | null
  hoursTarget: HoursTarget | null
  createdAt: string
}

interface ExamSectionsSettings {
  sections: CpaSectionCode[]
  mandatory: CpaSectionCode[]
  discipline: DisciplineCpaSection
  disciplineOptions: Array<{ section: DisciplineCpaSection; name: string }>
}

const DEFAULT_EXAM_SECTIONS: ExamSectionsSettings = {
  sections: [...ACTIVE_CPA_SECTIONS],
  mandatory: [...MANDATORY_CPA_SECTIONS],
  discipline: 'TCP',
  disciplineOptions: DISCIPLINE_CPA_SECTIONS.map((section) => ({
    section,
    name: CPA_SECTION_META[section].name,
  })),
}

function emitToast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message, variant } }))
}

function selectedDateEntries(examDates: ExamDates, sections: CpaSectionCode[]): Record<string, string> {
  return Object.fromEntries(
    sections
      .map((section) => [section, examDates[section]] as const)
      .filter((entry): entry is readonly [CpaSectionCode, string] => Boolean(entry[1]?.trim())),
  )
}

function buildPromptText(examDates: ExamDates, hoursTarget: HoursTarget, sections: CpaSectionCode[]): string {
  const dailyHours = hoursTarget.daily != null ? String(hoursTarget.daily) : '4'
  const weeklyHours = hoursTarget.weekly != null ? String(hoursTarget.weekly) : '28'
  const totalHours = hoursTarget.total != null ? String(hoursTarget.total) : '500'
  const examDateLines = sections
    .map((section) => `- ${section}: ${examDates[section] ?? 'not set'}`)
    .join('\n')
  const sectionList = sections.join('|')

  return `I'm studying for the CPA exam. Please create a detailed daily study routine.

Exam dates:
${examDateLines}

Study time available: ${dailyHours} hours/day, ${weeklyHours} hours/week, ${totalHours} total hours

Please structure your response as XML with this exact format:
<study-routine>
  <morning>
    <block time="HH:MM" duration="minutes" type="reading|anki|questions|review">
      <task section="${sectionList}" unit="Topic name" chapter="Ch X.Y" />
    </block>
  </morning>
  <midday>...</midday>
  <evening>...</evening>
</study-routine>

Focus on my weakest areas and the exam that is coming up soonest.`
}

export function StudyTab() {
  const qc = useQueryClient()
  const [xmlValue, setXmlValue] = useState('')
  const [examDates, setExamDates] = useState<ExamDates>({})
  const [hoursTarget, setHoursTarget] = useState<HoursTarget>({})
  const [isDragging, setIsDragging] = useState(false)
  const [promptVisible, setPromptVisible] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: examSettings = DEFAULT_EXAM_SECTIONS } = useQuery<ExamSectionsSettings>({
    queryKey: ['exam-sections'],
    queryFn: async () => {
      const res = await fetch('/api/settings/exam-sections')
      if (!res.ok) return DEFAULT_EXAM_SECTIONS
      return res.json() as Promise<ExamSectionsSettings>
    },
  })

  const selectedSections = examSettings.sections
  const promptText = useMemo(
    () => buildPromptText(examDates, hoursTarget, selectedSections),
    [examDates, hoursTarget, selectedSections],
  )

  const { data: routine } = useQuery<StudyRoutine | null>({
    queryKey: ['study-routine'],
    queryFn: async () => {
      const res = await fetch('/api/study-routine')
      if (!res.ok) return null
      return res.json() as Promise<StudyRoutine | null>
    },
  })

  useEffect(() => {
    if (routine) {
      setXmlValue(routine.xmlSource ?? '')
      setExamDates((routine.examDates as ExamDates) ?? {})
      setHoursTarget((routine.hoursTarget as HoursTarget) ?? {})
    }
  }, [routine])

  const examSectionsMutation = useMutation({
    mutationFn: async (discipline: DisciplineCpaSection) => {
      const res = await fetch('/api/settings/exam-sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(body.error?.message ?? `HTTP ${res.status}`)
      }
      return res.json() as Promise<ExamSectionsSettings>
    },
    onSuccess: (settings) => {
      qc.setQueryData(['exam-sections'], settings)
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['topics'] })
      void qc.invalidateQueries({ queryKey: ['anki-cards'] })
      void qc.invalidateQueries({ queryKey: ['anki-due'] })
      emitToast('Exam sections saved.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Exam section save failed: ${err.message}`, 'error')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/study-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xmlSource: xmlValue,
          examDates: selectedDateEntries(examDates, selectedSections),
          hoursTarget,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(body.error?.message ?? `HTTP ${res.status}`)
      }
      return res.json() as Promise<StudyRoutine>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['study-routine'] })
      void qc.invalidateQueries({ queryKey: ['study-routine-today'] })
      emitToast('Study routine saved.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Save failed: ${err.message}`, 'error')
    },
  })

  const handleValidate = useCallback(async () => {
    try {
      const res = await fetch('/api/study-routine/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml: xmlValue }),
      })
      const result = (await res.json()) as {
        success: boolean
        errors?: string[]
        stats?: { blockCount: number; taskCount: number; totalMinutes: number }
      }
      if (result.success) {
        setValidationErrors([])
        emitToast(
          `Valid - ${result.stats?.blockCount ?? 0} blocks, ${result.stats?.taskCount ?? 0} tasks`,
          'success',
        )
      } else {
        const errs = result.errors ?? ['Invalid XML']
        setValidationErrors(errs)
        emitToast(errs[0] ?? 'Invalid XML', 'error')
      }
    } catch {
      setValidationErrors([])
      emitToast('Validation request failed', 'error')
    }
  }, [xmlValue])

  const handleCopyPrompt = useCallback(() => {
    void navigator.clipboard.writeText(promptText)
    emitToast('Copied to clipboard.', 'success')
  }, [promptText])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setXmlValue((ev.target?.result as string) ?? '')
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="flex flex-col gap-5" role="tabpanel" id="tabpanel-study" aria-labelledby="tab-study">
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-[color:var(--ink)]">Exam Sections</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow mb-2">Mandatory</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mandatory CPA exams">
              {examSettings.mandatory.map((section) => (
                <label
                  key={section}
                  className="inline-flex items-center gap-2 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-3 py-2 text-sm text-[color:var(--ink)]"
                >
                  <input type="checkbox" checked readOnly disabled className="accent-[color:var(--accent)]" />
                  <span className="font-mono text-xs font-semibold">{section}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Discipline</p>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="CPA discipline exam">
              {examSettings.disciplineOptions.map(({ section, name }) => {
                const active = examSettings.discipline === section
                return (
                  <label
                    key={section}
                    className={[
                      'flex cursor-pointer items-start gap-2 rounded border px-3 py-2 text-sm transition-colors',
                      active
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent-faint)]'
                        : 'border-[color:var(--border)] bg-[color:var(--canvas)] hover:border-[color:var(--accent)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="discipline-section"
                      value={section}
                      checked={active}
                      disabled={examSectionsMutation.isPending}
                      onChange={() => examSectionsMutation.mutate(section)}
                      className="mt-0.5 accent-[color:var(--accent)]"
                    />
                    <span>
                      <span className="block font-mono text-xs font-semibold text-[color:var(--ink)]">{section}</span>
                      <span className="mt-0.5 block text-xs text-[color:var(--ink-faint)]">{name}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-[color:var(--ink)]">Study Schedule</h2>

        <div
          className="relative"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={xmlValue}
            onChange={(e) => setXmlValue(e.target.value)}
            placeholder="<study-routine>...</study-routine>"
            aria-label="Study routine XML source"
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--canvas)] p-3 text-xs text-[color:var(--ink)] resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{
              fontFamily: 'var(--font-mono)',
              minHeight: 200,
            }}
          />
          {isDragging && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-[color:var(--accent)] bg-[color:var(--accent-faint)]"
              aria-hidden="true"
            >
              <span className="text-sm font-medium text-[color:var(--accent)]">Drop .xml file here</span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="eyebrow mb-3">Exam Dates</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {selectedSections.map((exam) => (
              <label key={exam} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[color:var(--ink-dim)]">{exam} Exam Date</span>
                <input
                  type="date"
                  value={examDates[exam] ?? ''}
                  onChange={(e) => setExamDates((prev) => ({ ...prev, [exam]: e.target.value }))}
                  aria-label={`${exam} exam date`}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-2.5 py-1.5 text-sm text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="eyebrow mb-3">Hours Target</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'daily', label: 'Hours/day' },
              { key: 'weekly', label: 'Hours/week' },
              { key: 'total', label: 'Total hours' },
            ] as { key: keyof HoursTarget; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[color:var(--ink-dim)]">{label}</span>
                <input
                  type="number"
                  min="1"
                  value={hoursTarget[key] ?? ''}
                  onChange={(e) =>
                    setHoursTarget((prev) => ({
                      ...prev,
                      [key]: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  aria-label={label}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-2.5 py-1.5 text-sm text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Btn variant="ghost" size="sm" onClick={() => void handleValidate()}>
            Validate XML
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !xmlValue.trim()}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save & Regenerate'}
          </Btn>
          <Btn variant="subtle" size="sm" onClick={handleCopyPrompt}>
            Copy study prompt
          </Btn>
        </div>

        {validationErrors.length > 0 && (
          <ul
            className="mt-3 space-y-1 rounded border border-[color:var(--error-border,#f87171)] bg-[color:var(--error-soft,#fef2f2)] p-3 text-xs text-[color:var(--error,#dc2626)]"
            role="list"
            aria-label="XML validation errors"
          >
            {validationErrors.map((error, index) => (
              <li key={index} className="font-mono">{error}</li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPromptVisible((value) => !value)}
            className="text-xs font-medium text-[color:var(--ink-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            aria-expanded={promptVisible}
            aria-controls="prompt-preview"
          >
            {promptVisible ? 'Hide' : 'Show'} prompt preview
          </button>

          {promptVisible && (
            <div
              id="prompt-preview"
              className="mt-2 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] p-3"
            >
              <pre className="whitespace-pre-wrap text-xs text-[color:var(--ink-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {promptText}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
