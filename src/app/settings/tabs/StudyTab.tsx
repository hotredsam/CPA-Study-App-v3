'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamDates {
  FAR?: string
  REG?: string
  AUD?: string
  TCP?: string
}

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

// ---------------------------------------------------------------------------
// XML validation helpers
// ---------------------------------------------------------------------------

function validateXml(xml: string): { valid: boolean; blocks: number; tasks: number; error?: string } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      return { valid: false, blocks: 0, tasks: 0, error: 'XML parse error: ' + parseError.textContent?.slice(0, 120) }
    }
    const blocks = doc.querySelectorAll('block').length
    const tasks = doc.querySelectorAll('task').length
    return { valid: true, blocks, tasks }
  } catch {
    return { valid: false, blocks: 0, tasks: 0, error: 'Could not parse XML' }
  }
}

// ---------------------------------------------------------------------------
// Toast shim (inline — we rely on parent ToastProvider via an event)
// ---------------------------------------------------------------------------

function emitToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('cpa-toast', { detail: { message, type } }))
}

// ---------------------------------------------------------------------------
// StudyTab
// ---------------------------------------------------------------------------

export function StudyTab() {
  const qc = useQueryClient()
  const [xmlValue, setXmlValue] = useState('')
  const [examDates, setExamDates] = useState<ExamDates>({})
  const [hoursTarget, setHoursTarget] = useState<HoursTarget>({})
  const [isDragging, setIsDragging] = useState(false)
  const [promptVisible, setPromptVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load latest routine
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/study-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlSource: xmlValue, examDates, hoursTarget }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<StudyRoutine>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['study-routine'] })
      emitToast('Study routine saved.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Save failed: ${err.message}`, 'error')
    },
  })

  const handleValidate = useCallback(() => {
    const result = validateXml(xmlValue)
    if (result.valid) {
      emitToast(`Valid — ${result.blocks} blocks, ${result.tasks} tasks`, 'success')
    } else {
      emitToast(result.error ?? 'Invalid XML', 'error')
    }
  }, [xmlValue])

  const handleCopyPrompt = useCallback(() => {
    const text = [
      "I'm studying for the CPA exam. Please create a detailed daily study routine for the following schedule:",
      `FAR exam: ${examDates.FAR ?? '[not set]'}, REG exam: ${examDates.REG ?? '[not set]'}, AUD exam: ${examDates.AUD ?? '[not set]'}, TCP exam: ${examDates.TCP ?? '[not set]'}`,
      `Available hours: ${hoursTarget.daily ?? '[not set]'} hours/day, ${hoursTarget.weekly ?? '[not set]'} hours/week, ${hoursTarget.total ?? '[not set]'} total hours`,
      'Please structure the routine as XML with <study-routine><morning><block>...</block></morning><midday>...</midday><evening>...</evening></study-routine> format.',
    ].join('\n')
    void navigator.clipboard.writeText(text)
    emitToast('Copied to clipboard!', 'success')
  }, [examDates, hoursTarget])

  // Drag-and-drop handler
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

  const promptText = [
    "I'm studying for the CPA exam. Please create a detailed daily study routine for the following schedule:",
    `FAR exam: ${examDates.FAR ?? '[not set]'}, REG exam: ${examDates.REG ?? '[not set]'}, AUD exam: ${examDates.AUD ?? '[not set]'}, TCP exam: ${examDates.TCP ?? '[not set]'}`,
    `Available hours: ${hoursTarget.daily ?? '[not set]'} hours/day, ${hoursTarget.weekly ?? '[not set]'} hours/week, ${hoursTarget.total ?? '[not set]'} total hours`,
    'Please structure the routine as XML with <study-routine><morning><block>...</block></morning><midday>...</midday><evening>...</evening></study-routine> format.',
  ].join('\n')

  return (
    <div className="flex flex-col gap-5" role="tabpanel" id="tabpanel-study" aria-labelledby="tab-study">
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Study Schedule
        </h2>

        {/* XML Textarea with drag overlay */}
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
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)] p-3 text-xs"
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
              <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                Drop .xml file here
              </span>
            </div>
          )}
        </div>

        {/* Exam dates */}
        <div className="mt-5">
          <p className="eyebrow mb-3">Exam Dates</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['FAR', 'REG', 'AUD', 'TCP'] as const).map((exam) => (
              <label key={exam} className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                  {exam} Exam Date
                </span>
                <input
                  type="date"
                  value={examDates[exam] ?? ''}
                  onChange={(e) => setExamDates((prev) => ({ ...prev, [exam]: e.target.value }))}
                  aria-label={`${exam} exam date`}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Hours target */}
        <div className="mt-5">
          <p className="eyebrow mb-3">Hours Target</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { key: 'daily', label: 'Hours/day' },
                { key: 'weekly', label: 'Hours/week' },
                { key: 'total', label: 'Total hours' },
              ] as { key: keyof HoursTarget; label: string }[]
            ).map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                  {label}
                </span>
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
                  className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Button row */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Btn variant="ghost" size="sm" onClick={handleValidate}>
            Validate XML
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !xmlValue.trim()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save & Regenerate'}
          </Btn>
          <Btn variant="subtle" size="sm" onClick={handleCopyPrompt}>
            Copy Claude prompt
          </Btn>
        </div>

        {/* Prompt preview */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPromptVisible((v) => !v)}
            className="text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{ color: 'var(--ink-dim)' }}
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
              <pre className="text-xs whitespace-pre-wrap" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-dim)' }}>
                {promptText}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
