'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Btn } from '@/components/ui/Btn'
import { Bar } from '@/components/ui/Bar'
import { Toggle } from '@/components/ui/Toggle'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Budget {
  id: string
  monthlyCapUsd: number
  warnThreshold: number
  autoDegrade: boolean
  hardStop: boolean
  currentUsageUsd: number
  rolloverEnabled: boolean
}

interface ModelConfig {
  id: string
  functionKey: string
  model: string
  batchEnabled: boolean
  cacheEnabled: boolean
  useOAuthFallback: boolean
}

interface CacheStats {
  hitRate: number
  totalEntries: number
  expiredEntries: number
  savingsUsd: number
}

interface QueueSummaryItem {
  functionKey: string
  count: number
}

// ---------------------------------------------------------------------------
// Display names for AI function keys
// ---------------------------------------------------------------------------

const FUNCTION_LABELS: Record<string, string> = {
  PIPELINE_GRADE: 'Question Grading',
  PIPELINE_SEGMENT: 'Segmentation',
  PIPELINE_TRANSCRIBE: 'Transcription',
  PIPELINE_EXTRACT: 'Question Extraction',
  PIPELINE_TAG: 'Content Tagging',
  TOPIC_EXTRACT: 'Topic Extraction',
  CHECKPOINT_QUIZ: 'Checkpoint Quiz',
  ANKI_GEN: 'Anki Card Gen',
  CHAT_TUTOR: 'Chat Tutor',
  VOICE_NOTE: 'Voice Note',
  TOPIC_NOTES: 'Topic AI Notes',
}

const FUNCTION_META: Record<string, { description: string; interest: string; downtime: string }> = {
  PIPELINE_GRADE: { description: 'Scores accounting and consulting performance for each question.', interest: 'High', downtime: 'Live' },
  PIPELINE_SEGMENT: { description: 'Splits recordings into question clips.', interest: 'High', downtime: 'Live' },
  PIPELINE_TRANSCRIBE: { description: 'Converts speech to timestamped transcript.', interest: 'Medium', downtime: 'Live' },
  PIPELINE_EXTRACT: { description: 'Extracts question text and choices from frames.', interest: 'High', downtime: 'Live' },
  PIPELINE_TAG: { description: 'Maps each question to section, unit, topic, and difficulty.', interest: 'Medium', downtime: 'Live' },
  TOPIC_EXTRACT: { description: 'Identifies canonical CPA topics in textbook chunks.', interest: 'Medium', downtime: 'Batch friendly' },
  CHECKPOINT_QUIZ: { description: 'Generates checkpoint questions after reading chunks.', interest: 'Medium', downtime: 'Live' },
  ANKI_GEN: { description: 'Creates flashcards from indexed textbook content.', interest: 'Medium', downtime: 'Batch friendly' },
  CHAT_TUTOR: { description: 'Answers follow-up questions with review or card context.', interest: 'Low', downtime: 'Live' },
  VOICE_NOTE: { description: 'Transcribes short card voice memos.', interest: 'Low', downtime: 'Live' },
  TOPIC_NOTES: { description: 'Refreshes structured notes for each topic.', interest: 'Low', downtime: 'Batch friendly' },
}

const OPENROUTER_MODELS = [
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4.5',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/whisper-large-v3',
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  'mistralai/mistral-large',
  'mistralai/mistral-small',
  'deepseek/deepseek-r1',
  'deepseek/deepseek-chat',
  'x-ai/grok-3',
  'qwen/qwen-max',
  'cohere/command-r-plus',
  'perplexity/sonar-pro',
  'moonshotai/kimi-k2',
]

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

function emitToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const variant = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message, variant } }))
}

// ---------------------------------------------------------------------------
// OpenRouter Key Card
// ---------------------------------------------------------------------------

function OpenRouterKeyCard() {
  const [keyInput, setKeyInput] = useState('')

  const { data: keyStatus, refetch } = useQuery<{ hasKey: boolean }>({
    queryKey: ['openrouter-key'],
    queryFn: async () => {
      const res = await fetch('/api/settings/openrouter-key')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ hasKey: boolean }>
    },
  })

  const updateKey = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch('/api/settings/openrouter-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      setKeyInput('')
      void refetch()
      emitToast('API key updated.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Failed: ${err.message}`, 'error')
    },
  })

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          OpenRouter API Key
        </h2>
        <span
          className="text-[10px] font-semibold mono px-2 py-0.5 rounded"
          style={{
            background: keyStatus?.hasKey ? 'var(--good-soft)' : 'var(--warn-soft)',
            color: keyStatus?.hasKey ? 'var(--good)' : 'var(--warn)',
          }}
          aria-label={keyStatus?.hasKey ? 'Key configured' : 'No key set'}
        >
          {keyStatus?.hasKey ? 'Key configured' : 'No key set'}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={keyStatus?.hasKey ? '••••••••••••••••' : 'sk-or-…'}
          aria-label="OpenRouter API key"
          className="flex-1 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
        />
        <Btn
          variant="primary"
          size="sm"
          onClick={() => keyInput.trim() && updateKey.mutate(keyInput.trim())}
          disabled={!keyInput.trim() || updateKey.isPending}
        >
          {updateKey.isPending ? 'Saving…' : 'Update Key'}
        </Btn>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Monthly Budget Card
// ---------------------------------------------------------------------------

function BudgetCard() {
  const qc = useQueryClient()

  const { data } = useQuery<{ budget: Budget | null }>({
    queryKey: ['budget'],
    queryFn: async () => {
      const res = await fetch('/api/settings/budget')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ budget: Budget | null }>
    },
  })

  const budget = data?.budget

  const [cap, setCap] = useState('')
  const [warnPct, setWarnPct] = useState('')

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Budget>) => {
      const res = await fetch('/api/settings/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ budget: Budget }>
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      setCap('')
      setWarnPct('')
      emitToast('Budget saved.', 'success')
    },
    onError: (err: Error) => {
      emitToast(`Failed: ${err.message}`, 'error')
    },
  })

  const usagePct = budget
    ? (budget.currentUsageUsd / budget.monthlyCapUsd) * 100
    : 0

  const handleSaveCap = () => {
    const capVal = parseFloat(cap)
    const warnVal = parseFloat(warnPct) / 100
    const payload: Partial<Budget> = {}
    if (!isNaN(capVal) && capVal > 0) payload.monthlyCapUsd = capVal
    if (!isNaN(warnVal) && warnVal > 0 && warnVal <= 1) payload.warnThreshold = warnVal
    if (Object.keys(payload).length) saveMutation.mutate(payload)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        Monthly Budget
      </h2>

      {budget && (
        <>
          <Bar
            pct={usagePct}
            height={8}
            accent={usagePct >= 90 ? 'var(--bad)' : usagePct >= (budget.warnThreshold * 100) ? 'var(--warn)' : 'var(--accent)'}
            aria-label={`Budget usage: ${usagePct.toFixed(1)}%`}
          />
          <p className="text-xs mt-1 mono tabular" style={{ color: 'var(--ink-dim)' }}>
            ${budget.currentUsageUsd.toFixed(2)} of ${budget.monthlyCapUsd.toFixed(2)} used this month
          </p>
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
            Cap ($)
          </span>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="1"
              step="1"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder={budget ? String(budget.monthlyCapUsd) : '50'}
              aria-label="Monthly cap in USD"
              className="flex-1 rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
            Warn at (%)
          </span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={warnPct}
            onChange={(e) => setWarnPct(e.target.value)}
            placeholder={budget ? String(Math.round(budget.warnThreshold * 100)) : '80'}
            aria-label="Warning threshold percentage"
            className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
          />
        </label>
      </div>

      <Btn
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={handleSaveCap}
        disabled={saveMutation.isPending || (!cap && !warnPct)}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save'}
      </Btn>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>Auto-degrade</p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              Switch Sonnet→Haiku when usage exceeds warn threshold
            </p>
          </div>
          <Toggle
            on={budget?.autoDegrade ?? false}
            onChange={(v) => saveMutation.mutate({ autoDegrade: v })}
            label="Auto-degrade toggle"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>Hard stop</p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              Block all LLM calls when usage reaches cap
            </p>
          </div>
          <Toggle
            on={budget?.hardStop ?? false}
            onChange={(v) => saveMutation.mutate({ hardStop: v })}
            label="Hard stop toggle"
          />
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Model Config Row
// ---------------------------------------------------------------------------

interface ModelConfigRowProps {
  config: ModelConfig
}

function ModelConfigRow({ config }: ModelConfigRowProps) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [modelInput, setModelInput] = useState(config.model)
  const [batch, setBatch] = useState(config.batchEnabled)
  const [cache, setCache] = useState(config.cacheEnabled)
  const [oauth, setOauth] = useState(config.useOAuthFallback)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/model-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionKey: config.functionKey,
          model: modelInput,
          batchEnabled: batch,
          cacheEnabled: cache,
          useOAuthFallback: oauth,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['model-configs'] })
      emitToast(`${FUNCTION_LABELS[config.functionKey] ?? config.functionKey} saved.`, 'success')
    },
    onError: (err: Error) => {
      emitToast(`Failed: ${err.message}`, 'error')
    },
  })

  const label = FUNCTION_LABELS[config.functionKey] ?? config.functionKey
  const meta = FUNCTION_META[config.functionKey]

  return (
    <div className="border border-[color:var(--border)] rounded">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
        aria-expanded={expanded}
        aria-label={`${label} model settings`}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {label}
          </span>
          <span className="text-xs mono" style={{ color: 'var(--ink-faint)' }}>
            {config.model}
          </span>
          {meta && (
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {meta.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {config.batchEnabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-faint)', color: 'var(--accent)' }}>
              batch
            </span>
          )}
          {config.cacheEnabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}>
              cache
            </span>
          )}
          <span className="text-[color:var(--ink-faint)] text-xs" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--border)] px-4 py-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
              Model
            </span>
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              aria-label={`${label} model identifier`}
              className="rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            >
              {OPENROUTER_MODELS.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
              {!OPENROUTER_MODELS.includes(modelInput) && (
                <option value={modelInput}>{modelInput}</option>
              )}
            </select>
          </label>

          {meta && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded bg-[color:var(--canvas-2)] border border-[color:var(--border)] p-3">
              <div>
                <p className="eyebrow mb-1">Interest</p>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>{meta.interest}</p>
              </div>
              <div>
                <p className="eyebrow mb-1">Downtime</p>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>{meta.downtime}</p>
              </div>
              <div>
                <p className="eyebrow mb-1">Calls</p>
                <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Tracked in model audit</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>Batch</span>
              <Toggle on={batch} onChange={setBatch} label={`${label} batch enabled`} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>Cache</span>
              <Toggle on={cache} onChange={setCache} label={`${label} cache enabled`} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>OAuth fallback</span>
              <Toggle on={oauth} onChange={setOauth} label={`${label} OAuth fallback`} />
            </div>
          </div>

          <Btn
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cache & Batch Stats Card
// ---------------------------------------------------------------------------

function CacheStatsCard() {
  const { data: cacheStats } = useQuery<CacheStats>({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const res = await fetch('/api/settings/cache-stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<CacheStats>
    },
  })

  const { data: queueData } = useQuery<{ summary: QueueSummaryItem[] }>({
    queryKey: ['queue-summary'],
    queryFn: async () => {
      const res = await fetch('/api/batch/queue-summary')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ summary: QueueSummaryItem[] }>
    },
  })

  return (
    <Card>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        Cache & Batch Stats
      </h2>

      {cacheStats && (
        <div className="mb-4">
          <p className="eyebrow mb-2">Cache</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-semibold mono tabular" style={{ color: 'var(--ink)' }}>
                {(cacheStats.hitRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Hit rate</p>
            </div>
            <div>
              <p className="text-lg font-semibold mono tabular" style={{ color: 'var(--ink)' }}>
                {cacheStats.totalEntries}
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Entries</p>
            </div>
            <div>
              <p className="text-lg font-semibold mono tabular" style={{ color: 'var(--good)' }}>
                ${cacheStats.savingsUsd.toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Est. savings</p>
            </div>
          </div>
        </div>
      )}

      {queueData && queueData.summary.length > 0 && (
        <>
          <p className="eyebrow mb-2">Batch Queue</p>
          <div className="flex flex-col gap-1">
            {queueData.summary.map((item) => (
              <div key={item.functionKey} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {FUNCTION_LABELS[item.functionKey] ?? item.functionKey}
                </span>
                <span className="text-xs mono tabular font-semibold" style={{ color: 'var(--ink)' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {(!cacheStats && !queueData) && (
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Loading stats…</p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ModelsTab
// ---------------------------------------------------------------------------

export function ModelsTab() {
  const { data: configsData } = useQuery<{ configs: ModelConfig[] }>({
    queryKey: ['model-configs'],
    queryFn: async () => {
      const res = await fetch('/api/settings/model-config')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ configs: ModelConfig[] }>
    },
  })

  return (
    <div
      className="flex flex-col gap-5"
      role="tabpanel"
      id="tabpanel-models"
      aria-labelledby="tab-models"
    >
      <OpenRouterKeyCard />
      <BudgetCard />

      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          AI Function Models
        </h2>
        <div className="flex flex-col gap-2">
          {configsData?.configs.map((cfg) => (
            <ModelConfigRow key={cfg.functionKey} config={cfg} />
          ))}
          {!configsData && (
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Loading configs…</p>
          )}
        </div>
      </Card>

      <CacheStatsCard />
    </div>
  )
}
