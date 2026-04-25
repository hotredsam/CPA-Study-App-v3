'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'
import { SectionBadge } from '@/components/ui/SectionBadge'
import { DEFAULT_EXAM_SECTIONS_SETTINGS, useExamSections } from '@/hooks/useExamSections'
import type { CpaSectionCode } from '@/lib/cpa-sections'

// ─── Types ────────────────────────────────────────────────────────────────────

type CpaSection = CpaSectionCode

type TextbookRow = {
  id: string
  title: string
  publisher: string | null
  sections: CpaSection[]
  pages: number | null
  chunkCount: number
  indexStatus: 'QUEUED' | 'INDEXING' | 'READY' | 'NEEDS_UPDATE' | 'FAILED'
  sizeBytes: string | null
  citedCount: number
  uploadedAt: string | Date
  indexedAt: string | Date | null
}

const FALLBACK_SECTIONS: CpaSection[] = DEFAULT_EXAM_SECTIONS_SETTINGS.sections

// ─── Index status badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TextbookRow['indexStatus'] }) {
  const configs: Record<TextbookRow['indexStatus'], { label: string; color: string; bg: string; pulse?: boolean }> = {
    READY: { label: 'Indexed', color: 'var(--good)', bg: 'var(--good-soft)' },
    INDEXING: { label: 'Indexing…', color: 'var(--warn)', bg: 'var(--warn-soft)', pulse: true },
    QUEUED: { label: 'Queued', color: 'var(--ink-faint)', bg: 'var(--canvas-2)' },
    FAILED: { label: 'Failed', color: 'var(--bad)', bg: 'var(--bad-soft)' },
    NEEDS_UPDATE: { label: 'Update needed', color: 'var(--warn)', bg: 'var(--warn-soft)' },
  }
  const cfg = configs[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.pulse && (
        <span
          className="pulse-dot inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.color }}
          aria-hidden="true"
        />
      )}
      {cfg.label}
    </span>
  )
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({
  initialFile,
  onClose,
  onSuccess,
}: {
  initialFile: File | null
  onClose: () => void
  onSuccess: (textbook: TextbookRow) => void
}) {
  const [title, setTitle] = useState(initialFile ? initialFile.name.replace(/\.(pdf|epub|html|htm)$/i, '') : '')
  const [publisher, setPublisher] = useState('')
  const [sections, setSections] = useState<CpaSection[]>([])
  const [file, setFile] = useState<File | null>(initialFile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: examSettings } = useExamSections()
  const sectionOptions = examSettings?.sections ?? FALLBACK_SECTIONS

  const toggleSection = (s: CpaSection) => {
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const estimatedCost = file
    ? `~$${((file.size / 1024 / 1024 / 2) * 0.05).toFixed(2)} to index`
    : null

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('title', title.trim())
      if (publisher) form.set('publisher', publisher)
      sections.forEach((section) => form.append('sections', section))
      if (file) form.set('file', file)

      const res = await fetch('/api/textbooks', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { textbook: TextbookRow }
      onSuccess(data.textbook)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }, [title, publisher, sections, file, onClose, onSuccess])

  // Trap focus on mount
  const firstRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload textbook"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="w-full max-w-md rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl"
        role="document"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">Upload Textbook</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-[color:var(--ink-faint)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="tb-title"
              className="block text-xs font-medium text-[color:var(--ink-dim)] mb-1"
            >
              Title <span aria-hidden="true" style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <input
              ref={firstRef}
              id="tb-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Becker FAR Textbook 2025"
              required
            />
          </div>

          <div>
            <label
              htmlFor="tb-publisher"
              className="block text-xs font-medium text-[color:var(--ink-dim)] mb-1"
            >
              Publisher
            </label>
            <input
              id="tb-publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--canvas)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              placeholder="Becker Professional Education"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[color:var(--ink-dim)] mb-2">Sections</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="CPA sections">
              {sectionOptions.map((s) => {
                const active = sections.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSection(s)}
                    className="rounded px-2.5 py-1 text-xs font-mono font-semibold hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--canvas-2)',
                      color: active ? 'white' : 'var(--ink-dim)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="tb-file"
              className="block text-xs font-medium text-[color:var(--ink-dim)] mb-1"
            >
              PDF file
            </label>
            <input
              ref={fileRef}
              id="tb-file"
              type="file"
              accept=".pdf,.epub,.html,.htm,application/pdf,application/epub+zip,text/html"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !title) setTitle(f.name.replace(/\.(pdf|epub|html|htm)$/i, ''))
              }}
              className="block w-full text-sm text-[color:var(--ink-dim)] file:mr-3 file:rounded file:border-0 file:bg-[color:var(--canvas-2)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[color:var(--ink-dim)]"
            />
            {file && (
              <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                {estimatedCost && <> - {estimatedCost}</>}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-[color:var(--bad)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={loading || !title.trim()}
            >
              {loading ? 'Uploading…' : 'Upload'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Textbook table row ───────────────────────────────────────────────────────

function TextbookTableRow({
  textbook,
  onReindex,
}: {
  textbook: TextbookRow
  onReindex: (id: string) => void
}) {
  const [reindexing, setReindexing] = useState(false)

  const handleReindex = useCallback(async () => {
    setReindexing(true)
    try {
      const res = await fetch(`/api/textbooks/${textbook.id}/reindex`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onReindex(textbook.id)
    } catch {
      // silently allow the parent to handle
    } finally {
      setReindexing(false)
    }
  }, [textbook.id, onReindex])

  return (
    <tr className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--canvas-2)] transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-[color:var(--ink)] max-w-[200px] truncate">{textbook.title}</p>
        {textbook.citedCount > 0 && (
          <span
            className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-mono font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {textbook.citedCount} cited
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--ink-dim)]">
        {textbook.publisher ?? '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {textbook.sections.map((s) => (
            <SectionBadge key={s} section={s} size="xs" />
          ))}
          {textbook.sections.length === 0 && (
            <span className="text-xs text-[color:var(--ink-faint)]">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-[color:var(--ink-dim)]">
        {textbook.pages ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-[color:var(--ink-dim)]">
        {textbook.chunkCount}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={textbook.indexStatus} />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-[color:var(--ink-dim)]">
        {textbook.citedCount}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <a href={`/library/${textbook.id}`}>
            <Btn variant="ghost" size="sm" aria-label={`Open ${textbook.title}`}>
              Open
            </Btn>
          </a>
          <Btn
            variant="subtle"
            size="sm"
            onClick={() => void handleReindex()}
            disabled={reindexing || textbook.indexStatus === 'INDEXING'}
            aria-label={`Re-index ${textbook.title}`}
          >
            {reindexing ? '…' : 'Re-index'}
          </Btn>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LibraryClient({ initialTextbooks }: { initialTextbooks: TextbookRow[] }) {
  const [textbooks, setTextbooks] = useState<TextbookRow[]>(initialTextbooks)
  const [modalOpen, setModalOpen] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const openUploadModal = useCallback((file?: File) => {
    setDroppedFile(file ?? null)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setDroppedFile(null)
  }, [])

  const handleSuccess = useCallback((textbook: TextbookRow) => {
    setTextbooks((prev) => [textbook, ...prev])
  }, [])

  const handleReindex = useCallback((id: string) => {
    setTextbooks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, indexStatus: 'QUEUED' as const } : t)),
    )
  }, [])

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        setDragOver(true)
      }
    }
    const handleDragLeave = () => setDragOver(false)
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer?.files[0]
      const name = file?.name.toLowerCase() ?? ''
      const supported =
        file?.type === 'application/pdf' ||
        file?.type === 'application/epub+zip' ||
        file?.type === 'text/html' ||
        name.endsWith('.pdf') ||
        name.endsWith('.epub') ||
        name.endsWith('.html') ||
        name.endsWith('.htm')
      if (file && supported) {
        openUploadModal(file)
      }
    }
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [openUploadModal])

  return (
    <div>
      {dragOver && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: 'var(--accent-faint)', border: '3px dashed var(--accent)' }}
          role="status"
          aria-live="polite"
          aria-label="Drop PDF here to upload"
        >
          <p className="text-xl font-semibold text-[color:var(--accent)]">Drop PDF here</p>
        </div>
      )}

      {modalOpen && (
        <UploadModal
          initialFile={droppedFile}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}

      <EyebrowHeading
        eyebrow="Library"
        title="Textbooks"
        right={
          <Btn variant="primary" onClick={() => openUploadModal()} aria-label="Upload textbook">
            Upload Textbook
          </Btn>
        }
      />

      {textbooks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded border-2 border-dashed border-[color:var(--border)] py-16 text-center"
          role="region"
          aria-label="Empty textbook library"
        >
          <p className="text-sm font-medium text-[color:var(--ink-dim)]">No textbooks yet</p>
          <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
            Upload a PDF or drag one anywhere on this page.
          </p>
          <div className="mt-4">
            <Btn variant="primary" size="sm" onClick={() => openUploadModal()}>
              Upload Textbook
            </Btn>
          </div>
        </div>
      ) : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['BOOK', 'PUBLISHER', 'SECTIONS', 'PAGES', 'CHUNKS', 'STATUS', 'CITED', 'ACTIONS'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[10px] font-semibold tracking-widest font-mono text-[color:var(--ink-faint)] uppercase"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {textbooks.map((t) => (
                  <TextbookTableRow key={t.id} textbook={t} onReindex={handleReindex} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
