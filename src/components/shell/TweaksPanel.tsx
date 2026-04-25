'use client'
import { useState, useEffect, useCallback } from 'react'

const THEMES = ['paper', 'night', 'sepia', 'sakura', 'scientific'] as const
const DENSITIES = ['comfortable', 'compact'] as const
const SERIFS = ['instrument', 'tiempos', 'source'] as const

type Theme = (typeof THEMES)[number]
type Density = (typeof DENSITIES)[number]
type Serif = (typeof SERIFS)[number]

interface Tweaks {
  theme: Theme
  accentHue: number
  density: Density
  serif: Serif
}

const DEFAULT_TWEAKS: Tweaks = {
  theme: 'paper',
  accentHue: 18,
  density: 'comfortable',
  serif: 'instrument',
}

const SERIF_LABELS: Record<Serif, string> = {
  instrument: 'Instrument Serif',
  tiempos: 'Tiempos',
  source: 'Source Serif',
}

function applyTweaks(tweaks: Tweaks) {
  const el = document.documentElement
  el.dataset['theme'] = tweaks.theme
  el.dataset['density'] = tweaks.density
  el.dataset['serif'] = tweaks.serif
  el.style.setProperty('--accent-hue', String(tweaks.accentHue))
}

function persistTweaks(tweaks: Tweaks) {
  try {
    localStorage.setItem('cpa-tweaks', JSON.stringify(tweaks))
  } catch {
    // ignore storage errors
  }
}

async function saveTweaksToServer(tweaks: Tweaks) {
  try {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          theme: tweaks.theme,
          accentHue: tweaks.accentHue,
          density: tweaks.density,
          serifFamily: SERIF_LABELS[tweaks.serif],
        }),
    })
  } catch {
    // non-fatal
  }
}

export function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS)

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const raw = localStorage.getItem('cpa-tweaks')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Tweaks> & { serifFamily?: string }
        const serifFromFamily =
          parsed.serifFamily === 'Tiempos'
            ? 'tiempos'
            : parsed.serifFamily === 'Source Serif'
              ? 'source'
              : parsed.serifFamily === 'Instrument Serif'
                ? 'instrument'
                : undefined
        setTweaks((prev) => ({ ...prev, ...parsed, serif: parsed.serif ?? serifFromFamily ?? prev.serif }))
      }
    } catch {
      // ignore
    }
  }, [])

  const update = useCallback((patch: Partial<Tweaks>) => {
    setTweaks((prev) => {
      const next = { ...prev, ...patch }
      applyTweaks(next)
      persistTweaks(next)
      void saveTweaksToServer(next)
      return next
    })
  }, [])

  return (
    <div className="border-t border-[color:var(--border)] mt-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="tweaks-panel"
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-[color:var(--ink-faint)] uppercase tracking-widest hover:text-[color:var(--ink)] transition-colors hov"
      >
        <span>Tweaks</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div id="tweaks-panel" className="px-4 pb-4 space-y-4">
          {/* Theme */}
          <fieldset>
            <legend className="eyebrow mb-2">Theme</legend>
            <div className="flex flex-wrap gap-1">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ theme: t })}
                  aria-pressed={tweaks.theme === t}
                  className={`px-2 py-1 rounded text-xs font-mono hov ${
                    tweaks.theme === t
                      ? 'bg-[color:var(--accent)] text-white'
                      : 'border border-[color:var(--border)] text-[color:var(--ink-dim)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Accent hue */}
          <div>
            <label htmlFor="accent-hue" className="eyebrow mb-2 block">
              Accent hue: {tweaks.accentHue}
            </label>
            <input
              id="accent-hue"
              type="range"
              min={0}
              max={360}
              value={tweaks.accentHue}
              onChange={(e) => update({ accentHue: Number(e.target.value) })}
              className="w-full accent-[color:var(--accent)]"
            />
          </div>

          {/* Density */}
          <fieldset>
            <legend className="eyebrow mb-2">Density</legend>
            <div className="flex gap-1">
              {DENSITIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update({ density: d })}
                  aria-pressed={tweaks.density === d}
                  className={`px-2 py-1 rounded text-xs font-mono hov ${
                    tweaks.density === d
                      ? 'bg-[color:var(--accent)] text-white'
                      : 'border border-[color:var(--border)] text-[color:var(--ink-dim)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Serif family */}
          <fieldset>
            <legend className="eyebrow mb-2">Serif</legend>
            <div className="flex flex-wrap gap-1">
              {SERIFS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ serif: s })}
                  aria-pressed={tweaks.serif === s}
                  className={`px-2 py-1 rounded text-xs font-mono hov ${
                    tweaks.serif === s
                      ? 'bg-[color:var(--accent)] text-white'
                      : 'border border-[color:var(--border)] text-[color:var(--ink-dim)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
