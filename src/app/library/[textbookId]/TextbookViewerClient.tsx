'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import { Card } from '@/components/ui/Card'

type ChunkItem = {
  id: string
  order: number
  chapterRef: string | null
  title: string | null
  content: string
  htmlContent: string | null
  topicId: string | null
  fasbCitation: string | null
  figures: unknown
}

type TocEntry = {
  label: string
  order: number
}

function buildToc(chunks: ChunkItem[]): TocEntry[] {
  return chunks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((chunk) => ({
      label: chunk.chapterRef ?? chunk.title ?? `Chunk ${chunk.order + 1}`,
      order: chunk.order,
    }))
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
    <nav aria-label="Table of contents" className="max-h-[74vh] space-y-0.5 overflow-y-auto pr-1">
      <p className="eyebrow mb-2">Contents</p>
      {entries.map((entry) => {
        const active = entry.order === currentOrder
        return (
          <button
            key={entry.order}
            type="button"
            onClick={() => onJump(entry.order)}
            aria-current={active ? 'location' : undefined}
            className="block w-full rounded px-2 py-1.5 text-left text-xs hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{
              background: active ? 'var(--accent-faint)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--ink-dim)',
              fontWeight: active ? 600 : 400,
            }}
          >
            {entry.label}
          </button>
        )
      })}
    </nav>
  )
}

export function TextbookViewerClient({
  textbookId,
  initialChunks,
  total,
}: {
  textbookId: string
  initialChunks: ChunkItem[]
  total: number
}) {
  const [chunkCache, setChunkCache] = useState<Map<number, ChunkItem>>(
    () => new Map(initialChunks.map((chunk) => [chunk.order, chunk])),
  )
  const [currentOrder, setCurrentOrder] = useState<number>(initialChunks[0]?.order ?? 0)
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
        const res = await fetch(`/api/textbooks/${textbookId}/chunks?offset=${order}&limit=1`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { chunks: ChunkItem[] }
        const chunk = data.chunks[0]
        if (chunk) {
          setChunkCache((prev) => new Map(prev).set(chunk.order, chunk))
          setCurrentOrder(chunk.order)
        }
      } catch {
        // Keep the current chunk visible; the user can retry navigation.
      } finally {
        setLoading(false)
      }
    },
    [chunkCache, textbookId],
  )

  const hasPrev = currentOrder > 0
  const hasNext = currentOrder < total - 1

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrev) void navigateTo(currentOrder - 1)
      if (event.key === 'ArrowRight' && hasNext) void navigateTo(currentOrder + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasPrev, hasNext, currentOrder, navigateTo])

  const toc = buildToc(Array.from(chunkCache.values()))
  const sourceFigureCount = Array.isArray(currentChunk?.figures) ? (currentChunk.figures as unknown[]).length : 0
  const htmlVisualCount = currentChunk?.htmlContent?.match(/<(?:figure|svg|table)\b/gi)?.length ?? 0

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr 200px' }}>
      <aside>
        <TocSidebar
          entries={toc}
          currentOrder={currentOrder}
          onJump={(order) => void navigateTo(order)}
        />
      </aside>

      <main>
        <Card>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="py-8 text-center text-sm text-[color:var(--ink-faint)]"
            >
              Loading...
            </div>
          ) : currentChunk ? (
            <div ref={contentRef} className="max-h-[74vh] overflow-y-auto pr-1">
              {currentChunk.htmlContent ? (
                <article
                  className="textbook-html-render"
                  aria-label={`Rendered textbook chunk ${currentChunk.order + 1}`}
                  dangerouslySetInnerHTML={{ __html: currentChunk.htmlContent }}
                />
              ) : (
                <>
                  {currentChunk.chapterRef && (
                    <p className="eyebrow mb-1">{currentChunk.chapterRef}</p>
                  )}
                  {currentChunk.title && (
                    <h2 className="mb-4 text-lg font-semibold text-[color:var(--ink)]">
                      {currentChunk.title}
                    </h2>
                  )}
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink-dim)]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {currentChunk.content}
                  </div>
                </>
              )}
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
              Prev
            </Btn>
            <span className="text-xs tabular-nums text-[color:var(--ink-faint)]">
              {currentOrder + 1} / {total}
            </span>
            <Btn
              variant="ghost"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => void navigateTo(currentOrder + 1)}
              aria-label="Next chunk"
            >
              Next
            </Btn>
          </div>
        </Card>
      </main>

      <aside>
        <Card>
          <p className="eyebrow mb-3">Chunk info</p>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-[color:var(--ink-faint)]">Topic ID</dt>
              <dd className="mt-0.5 truncate font-mono text-[color:var(--ink-dim)]">
                {currentChunk?.topicId ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">FASB Citation</dt>
              <dd className="mt-0.5 text-[color:var(--ink-dim)]">
                {currentChunk?.fasbCitation ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">HTML Visuals</dt>
              <dd className="mt-0.5 text-[color:var(--ink-dim)]">{htmlVisualCount}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">Source Figures</dt>
              <dd className="mt-0.5 text-[color:var(--ink-dim)]">{sourceFigureCount}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--ink-faint)]">Order</dt>
              <dd className="mt-0.5 font-mono text-[color:var(--ink-dim)]">
                {currentChunk?.order ?? '-'}
              </dd>
            </div>
          </dl>
        </Card>
      </aside>
    </div>
  )
}
