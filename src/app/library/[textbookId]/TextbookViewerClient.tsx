'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChunkItem = {
  id: string
  order: number
  chapterRef: string | null
  title: string | null
  content: string
  topicId: string | null
  fasbCitation: string | null
  figures: unknown
}

type TocEntry = {
  chapterRef: string
  order: number
}

// ─── TOC sidebar ──────────────────────────────────────────────────────────────

function buildToc(chunks: ChunkItem[]): TocEntry[] {
  const seen = new Set<string>()
  const entries: TocEntry[] = []
  for (const c of chunks) {
    if (c.chapterRef && !seen.has(c.chapterRef)) {
      seen.add(c.chapterRef)
      entries.push({ chapterRef: c.chapterRef, order: c.order })
    }
  }
  return entries
}

function TocSidebar({
  entries,
  currentOrder,
  onJump,
}: {
  entries: TocEntry[]
  currentOrder: number
  onJump: (order: number) => void
}) {
  if (entries.length === 0) return null
  return (
    <nav aria-label="Table of contents" className="space-y-0.5">
      <p className="eyebrow mb-2">Contents</p>
      {entries.map((e) => {
        const active = e.order === currentOrder
        return (
          <button
            key={e.chapterRef}
            type="button"
            onClick={() => onJump(e.order)}
            aria-current={active ? 'location' : undefined}
            className="block w-full rounded px-2 py-1.5 text-left text-xs hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{
              background: active ? 'var(--accent-faint)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--ink-dim)',
              fontWeight: active ? 600 : 400,
            }}
          >
            {e.chapterRef}
          </button>
        )
      })}
    </nav>
  )
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export function TextbookViewerClient({
  textbookId,
  initialChunks,
  total,
}: {
  textbookId: string
  initialChunks: ChunkItem[]
  total: number
}) {
  // Cache of loaded chunks, keyed by order
  const [chunkCache, setChunkCache] = useState<Map<number, ChunkItem>>(
    () => new Map(initialChunks.map((c) => [c.order, c])),
  )
  const [currentOrder, setCurrentOrder] = useState<number>(
    initialChunks[0]?.order ?? 0,
  )
  const [loading, setLoading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const currentChunk = chunkCache.get(currentOrder) ?? null

  const navigateTo = useCallback(
    async (order: number) => {
      contentRef.current?.scrollTo({ top: 0 })
      if (chunkCache.has(order)) {
        setCurrentOrder(order)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(
          `/api/textbooks/${textbookId}/chunks?offset=${order}&limit=1`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { chunks: ChunkItem[] }
        const chunk = data.chunks[0]
        if (chunk) {
          setChunkCache((prev) => new Map(prev).set(chunk.order, chunk))
          setCurrentOrder(chunk.order)
        }
      } catch {
        // silently ignore — user can retry
      } finally {
        setLoading(false)
      }
    },
    [chunkCache, textbookId],
  )

  const hasPrev = currentOrder > 0
  const hasNext = currentOrder < total - 1

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) void navigateTo(currentOrder - 1)
      if (e.key === 'ArrowRight' && hasNext) void navigateTo(currentOrder + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasPrev, hasNext, currentOrder, navigateTo])

  const toc = buildToc(Array.from(chunkCache.values()).sort((a, b) => a.order - b.order))

  const figureCount =
    Array.isArray(currentChunk?.figures) ? (currentChunk.figures as unknown[]).length : 0

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr 200px' }}>
      {/* TOC */}
      <aside>
        <TocSidebar
          entries={toc}
          currentOrder={currentOrder}
          onJump={(order) => void navigateTo(order)}
        />
      </aside>

      {/* Content */}
      <main>
        <Card>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="py-8 text-center text-sm text-[color:var(--ink-faint)]"
            >
              Loading…
            </div>
          ) : currentChunk ? (
            <div
              ref={contentRef}
              className="max-h-[70vh] overflow-y-auto pr-1"
            >
              {currentChunk.chapterRef && (
                <p className="eyebrow mb-1">{currentChunk.chapterRef}</p>
              )}
              {currentChunk.title && (
                <h2 className="text-lg font-semibold text-[color:var(--ink)] mb-4">
                  {currentChunk.title}
                </h2>
              )}
              <div
                className="text-sm leading-relaxed text-[color:var(--ink-dim)] whitespace-pre-wrap"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {currentChunk.content}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--ink-faint)]">No content available.</p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-3">
            <Btn
              variant="ghost"
              size="sm"
              disabled={!hasPrev || loading}
              onClick={() => void navigateTo(currentOrder - 1)}
              aria-label="Previous chunk"
            >
              ← Prev
            </Btn>
            <span className="text-xs text-[color:var(--ink-faint)] tabular-nums">
              {currentOrder + 1} / {total}
            </span>
            <Btn
              variant="ghost"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => void navigateTo(currentOrder + 1)}
              aria-label="Next chunk"
            >
              Next →
            </Btn>
          </div>
        </Card>
      </main>

      {/* Chunk metadata */}
      <aside>
        <Card>
          <p className="eyebrow mb-3">Chunk info</p>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-[color:var(--ink-faint)]">Topic ID</dt>
              <dd className="mt-0.5 font-mono text-[color:var(--ink-dim)] truncate">
                {currentChunk?.topicId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">FASB Citation</dt>
              <dd className="mt-0.5 text-[color:var(--ink-dim)]">
                {currentChunk?.fasbCitation ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">Figures</dt>
              <dd className="mt-0.5 text-[color:var(--ink-dim)]">{figureCount}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">Order</dt>
              <dd className="mt-0.5 font-mono text-[color:var(--ink-dim)]">
                {currentChunk?.order ?? '—'}
              </dd>
            </div>
          </dl>
        </Card>
      </aside>
    </div>
  )
}
