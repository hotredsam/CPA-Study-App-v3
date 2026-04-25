'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'
import { Toggle } from '@/components/ui/Toggle'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IndexingConfig {
  id: string
  indexDepth: number
  ocrMode: boolean
  formulaExtraction: boolean
  exampleDetection: boolean
  crossRefLinking: boolean
  glossaryBuild: boolean
  figureCaptioning: boolean
  sectionAutoTag: boolean
  unitGrouping: boolean
  ankiCardGen: boolean
  piiScrubbing: boolean
  reindexOnUpdate: boolean
  embeddingModel: string
  indexModel: string
  batchMode: boolean
  offPeakTier: boolean
  concurrency: number
  chunkSize: number
  overlapWindow: number
}

type BooleanKey = keyof {
  [K in keyof IndexingConfig as IndexingConfig[K] extends boolean ? K : never]: IndexingConfig[K]
}

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

function emitToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const variant = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message, variant } }))
}

// ---------------------------------------------------------------------------
// Boolean toggles config
// ---------------------------------------------------------------------------

const BOOL_TOGGLES: { key: BooleanKey; label: string }[] = [
  { key: 'ocrMode', label: 'OCR Mode' },
  { key: 'formulaExtraction', label: 'Formula Extraction' },
  { key: 'exampleDetection', label: 'Example Detection' },
  { key: 'crossRefLinking', label: 'Cross-Reference Linking' },
  { key: 'glossaryBuild', label: 'Glossary Build' },
  { key: 'figureCaptioning', label: 'Figure Captioning' },
  { key: 'sectionAutoTag', label: 'Section Auto-Tag' },
  { key: 'unitGrouping', label: 'Unit Grouping' },
  { key: 'ankiCardGen', label: 'Anki Card Gen' },
  { key: 'piiScrubbing', label: 'PII Scrubbing' },
  { key: 'reindexOnUpdate', label: 'Reindex on Update' },
]

// Cost estimator: pages * 0.5 chunks/page * chunkSize/1000 tokens * $0.0005
function estimateCost(chunkSize: number): string {
  const pages = 500
  const chunksPerPage = 0.5
  const pricePerKToken = 0.0005
  const cost = pages * chunksPerPage * (chunkSize / 1000) * pricePerKToken
  return `$${cost.toFixed(4)}`
}

// ---------------------------------------------------------------------------
// IndexingTab
// ---------------------------------------------------------------------------

export function IndexingTab() {
  const qc = useQueryClient()

  const { data: remote } = useQuery<IndexingConfig | null>({
    queryKey: ['indexing-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/indexing')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<IndexingConfig | null>
    },
  })

  // Local draft state
  const [draft, setDraft] = useState<Partial<IndexingConfig>>({})

  useEffect(() => {
    if (remote) setDraft({ ...remote })
  }, [remote])

  const merged: IndexingConfig = {
    id: 'singleton',
    indexDepth: 3,
    ocrMode: true,
    formulaExtraction: true,
    exampleDetection: true,
    crossRefLinking: true,
    glossaryBuild: true,
    figureCaptioning: false,
    sectionAutoTag: true,
    unitGrouping: true,
    ankiCardGen: true,
    piiScrubbing: true,
    reindexOnUpdate: false,
    embeddingModel: 'text-embedding-3-large',
    indexModel: 'anthropic/claude-haiku-4.5',
    batchMode: true,
    offPeakTier: false,
    concurrency: 8,
    chunkSize: 512,
    overlapWindow: 64,
    ...draft,
  }

  const setBool = (key: BooleanKey, value: boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/indexing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<IndexingConfig>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['indexing-config'] })
      emitToast('Indexing settings saved.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Failed: ${err.message}`, 'error')
    },
  })

  const estimatedCost = estimateCost(merged.chunkSize)

  return (
    <div
      className="flex flex-col gap-5"
      role="tabpanel"
      id="tabpanel-indexing"
      aria-labelledby="tab-indexing"
    >
      {/* Indexing Options */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Indexing Options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOOL_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label htmlFor={`toggle-${key}`} className="text-sm cursor-pointer" style={{ color: 'var(--ink)' }}>
                {label}
              </label>
              <Toggle
                on={merged[key] as boolean}
                onChange={(v) => setBool(key, v)}
                label={label}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Model & Performance */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Indexing Model & Performance
        </h2>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
              Index model
            </span>
            <input
              type="text"
              value={merged.indexModel}
              onChange={(e) => setDraft((prev) => ({ ...prev, indexModel: e.target.value }))}
              aria-label="Indexing model identifier"
              className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
              Embedding model
            </span>
            <select
              value={merged.embeddingModel}
              onChange={(e) => setDraft((prev) => ({ ...prev, embeddingModel: e.target.value }))}
              aria-label="Embedding model"
              className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            >
              <option value="text-embedding-3-large">text-embedding-3-large</option>
              <option value="text-embedding-3-small">text-embedding-3-small</option>
              <option value="@cf/baai/bge-large-en-v1.5">@cf/baai/bge-large-en-v1.5</option>
            </select>
          </label>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>Batch mode</span>
              <Toggle
                on={merged.batchMode}
                onChange={(v) => setDraft((prev) => ({ ...prev, batchMode: v }))}
                label="Batch mode"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>Off-peak tier</span>
              <Toggle
                on={merged.offPeakTier}
                onChange={(v) => setDraft((prev) => ({ ...prev, offPeakTier: v }))}
                label="Off-peak tier"
              />
            </div>
          </div>

          {/* Concurrency */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="index-depth-slider" className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                Index depth
              </label>
              <span className="text-xs mono tabular" style={{ color: 'var(--ink)' }}>
                {merged.indexDepth}
              </span>
            </div>
            <input
              id="index-depth-slider"
              type="range"
              min="1"
              max="5"
              step="1"
              value={merged.indexDepth}
              onChange={(e) => setDraft((prev) => ({ ...prev, indexDepth: Number(e.target.value) }))}
              aria-label="Index depth"
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={merged.indexDepth}
              className="w-full h-2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Concurrency */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="concurrency-slider" className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                Concurrency
              </label>
              <span className="text-xs mono tabular" style={{ color: 'var(--ink)' }}>
                {merged.concurrency}
              </span>
            </div>
            <input
              id="concurrency-slider"
              type="range"
              min="4"
              max="32"
              step="1"
              value={merged.concurrency}
              onChange={(e) => setDraft((prev) => ({ ...prev, concurrency: Number(e.target.value) }))}
              aria-label="Concurrency level"
              aria-valuemin={4}
              aria-valuemax={32}
              aria-valuenow={merged.concurrency}
              aria-valuetext={`${merged.concurrency} concurrent workers`}
              className="w-full h-2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              <span>4</span>
              <span>32</span>
            </div>
          </div>

          {/* Chunk size */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="chunk-size-slider" className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                Chunk size (tokens)
              </label>
              <span className="text-xs mono tabular" style={{ color: 'var(--ink)' }}>
                {merged.chunkSize}
              </span>
            </div>
            <input
              id="chunk-size-slider"
              type="range"
              min="128"
              max="2048"
              step="128"
              value={merged.chunkSize}
              onChange={(e) => setDraft((prev) => ({ ...prev, chunkSize: Number(e.target.value) }))}
              aria-label="Chunk size in tokens"
              aria-valuemin={128}
              aria-valuemax={2048}
              aria-valuenow={merged.chunkSize}
              aria-valuetext={`${merged.chunkSize} tokens per chunk`}
              className="w-full h-2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              <span>128</span>
              <span>2048</span>
            </div>
          </div>

          {/* Overlap window */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="overlap-slider" className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
                Overlap window (tokens)
              </label>
              <span className="text-xs mono tabular" style={{ color: 'var(--ink)' }}>
                {merged.overlapWindow}
              </span>
            </div>
            <input
              id="overlap-slider"
              type="range"
              min="0"
              max="256"
              step="16"
              value={merged.overlapWindow}
              onChange={(e) => setDraft((prev) => ({ ...prev, overlapWindow: Number(e.target.value) }))}
              aria-label="Overlap window in tokens"
              aria-valuemin={0}
              aria-valuemax={256}
              aria-valuenow={merged.overlapWindow}
              aria-valuetext={`${merged.overlapWindow} token overlap`}
              className="w-full h-2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              <span>0</span>
              <span>256</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cost Estimator */}
      <Card>
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
          Cost Estimator
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded border border-[color:var(--border)] bg-[color:var(--canvas-2)] p-3">
            <p className="text-xs mb-1" style={{ color: 'var(--ink-dim)' }}>
              Batch + off-peak
            </p>
            <p className="text-2xl font-semibold mono tabular" style={{ color: 'var(--good)' }}>
              {estimatedCost}
            </p>
          </div>
          <div className="rounded border border-[color:var(--border)] bg-[color:var(--canvas-2)] p-3">
            <p className="text-xs mb-1" style={{ color: 'var(--ink-dim)' }}>
              Live, no batch
            </p>
            <p className="text-2xl font-semibold mono tabular" style={{ color: 'var(--warn)' }}>
              ${((parseFloat(estimatedCost.slice(1)) || 0) * 2.4).toFixed(4)}
            </p>
          </div>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
          500 pages × 0.5 chunks/page × {merged.chunkSize} tokens × $0.0005/1k tokens (Haiku input)
        </p>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Btn
          variant="primary"
          size="md"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Indexing Settings'}
        </Btn>
      </div>
    </div>
  )
}
