'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThemeName = 'paper' | 'night' | 'sepia' | 'sakura' | 'scientific'
type DensityName = 'comfortable' | 'compact'
type SerifName = 'Instrument Serif' | 'Tiempos' | 'Source Serif'

interface TweakState {
  theme: ThemeName
  accentHue: number
  density: DensityName
  serifFamily: SerifName
}

const THEMES: { id: ThemeName; label: string; canvas: string }[] = [
  { id: 'paper', label: 'Paper', canvas: 'oklch(0.975 0.006 75)' },
  { id: 'night', label: 'Night', canvas: 'oklch(0.14 0.008 260)' },
  { id: 'sepia', label: 'Sepia', canvas: 'oklch(0.94 0.028 75)' },
  { id: 'sakura', label: 'Sakura', canvas: 'oklch(0.965 0.018 10)' },
  { id: 'scientific', label: 'Scientific', canvas: 'oklch(0.11 0.010 240)' },
]

const SERIF_FAMILIES: { id: SerifName; label: string; dataValue: string }[] = [
  { id: 'Instrument Serif', label: 'Instrument Serif', dataValue: 'instrument' },
  { id: 'Tiempos', label: 'Tiempos', dataValue: 'tiempos' },
  { id: 'Source Serif', label: 'Source Serif', dataValue: 'source' },
]

const LOCAL_KEY = 'cpa-tweaks'
const DEBOUNCE_MS = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromLocalStorage(): Partial<TweakState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<TweakState>
  } catch {
    return {}
  }
}

function applyToDocument(state: TweakState) {
  const html = document.documentElement
  html.setAttribute('data-theme', state.theme)
  html.setAttribute('data-density', state.density)
  const serif = SERIF_FAMILIES.find((s) => s.id === state.serifFamily)
  html.setAttribute('data-serif', serif?.dataValue ?? 'instrument')
  html.style.setProperty('--accent-hue', String(state.accentHue))
}

// ---------------------------------------------------------------------------
// AppearanceTab
// ---------------------------------------------------------------------------

export function AppearanceTab() {
  const [state, setState] = useState<TweakState>({
    theme: 'paper',
    accentHue: 18,
    density: 'comfortable',
    serifFamily: 'Instrument Serif',
  })

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFromLocalStorage()
    setState((prev) => ({ ...prev, ...saved }))
  }, [])

  // Debounced API save ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateState = useCallback((patch: Partial<TweakState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      // Apply immediately
      applyToDocument(next)
      // Persist to localStorage
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
      // Debounced API save
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: next.theme,
            accentHue: next.accentHue,
            density: next.density,
            serifFamily: next.serifFamily,
          }),
        })
      }, DEBOUNCE_MS)
      return next
    })
  }, [])

  // Pill button helper
  const PillBtn = ({
    active,
    onClick,
    children,
    ariaLabel,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
    ariaLabel: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={[
        'px-4 py-2 text-sm font-medium rounded-[3px] border hov',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
        'focus-visible:outline-[color:var(--accent)]',
        active
          ? 'border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-faint)]'
          : 'border-[color:var(--border)] text-[color:var(--ink-dim)] bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  )

  return (
    <div
      className="flex flex-col gap-5"
      role="tabpanel"
      id="tabpanel-appearance"
      aria-labelledby="tab-appearance"
    >
      {/* Theme */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Theme
        </h2>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color theme">
          {THEMES.map((t) => {
            const active = state.theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${t.label} theme`}
                onClick={() => updateState({ theme: t.id })}
                className={[
                  'flex flex-col items-center gap-2 p-2 rounded-lg border-2 hov',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
                  'focus-visible:outline-[color:var(--accent)]',
                  active ? 'border-[color:var(--accent)]' : 'border-[color:var(--border)]',
                ].join(' ')}
              >
                <div
                  className="w-14 h-9 rounded"
                  style={{ background: t.canvas, border: '1px solid var(--border)' }}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium" style={{ color: active ? 'var(--accent)' : 'var(--ink-dim)' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Accent color */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Accent Color
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="360"
            value={state.accentHue}
            onChange={(e) => updateState({ accentHue: Number(e.target.value) })}
            aria-label="Accent hue slider"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={state.accentHue}
            aria-valuetext={`Hue ${state.accentHue}`}
            className="flex-1 h-2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
            style={{
              background: `linear-gradient(to right, ${Array.from({ length: 7 }, (_, i) => `oklch(0.52 0.18 ${i * 60})`).join(', ')})`,
            }}
          />
          <div
            className="w-9 h-9 rounded-full shrink-0 border border-[color:var(--border)]"
            style={{ background: `oklch(0.52 0.18 ${state.accentHue})` }}
            aria-label={`Current accent color at hue ${state.accentHue}`}
          />
        </div>
        <p className="text-xs mt-1 mono tabular" style={{ color: 'var(--ink-faint)' }}>
          Hue: {state.accentHue}
        </p>
        <button
          type="button"
          onClick={() => updateState({ accentHue: 18 })}
          className="mt-2 text-xs hov focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]"
          style={{ color: 'var(--ink-dim)' }}
        >
          Reset to default (18)
        </button>
      </Card>

      {/* Density */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Density
        </h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Layout density">
          <PillBtn
            active={state.density === 'comfortable'}
            onClick={() => updateState({ density: 'comfortable' })}
            ariaLabel="Comfortable density"
          >
            Comfortable
          </PillBtn>
          <PillBtn
            active={state.density === 'compact'}
            onClick={() => updateState({ density: 'compact' })}
            ariaLabel="Compact density"
          >
            Compact
          </PillBtn>
        </div>
      </Card>

      {/* Serif font */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
          Serif Font
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Serif font family">
          {SERIF_FAMILIES.map((s) => (
            <PillBtn
              key={s.id}
              active={state.serifFamily === s.id}
              onClick={() => updateState({ serifFamily: s.id })}
              ariaLabel={`${s.label} font`}
            >
              {s.label}
            </PillBtn>
          ))}
        </div>
      </Card>
    </div>
  )
}
