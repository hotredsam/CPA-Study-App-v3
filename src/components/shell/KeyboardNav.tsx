'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const NAV_MAP: Record<string, { path: string; label: string }> = {
  h: { path: '/',         label: 'Dashboard' },
  r: { path: '/record',   label: 'Record' },
  s: { path: '/pipeline', label: 'Pipeline' },
  v: { path: '/review',   label: 'Review' },
  y: { path: '/topics',   label: 'Topics' },
  u: { path: '/study',    label: 'Study' },
  a: { path: '/anki',     label: 'Anki' },
  l: { path: '/library',  label: 'Library' },
  t: { path: '/settings', label: 'Settings' },
}

function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl shadow-xl p-6 min-w-[280px] max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[color:var(--ink-faint)] mb-4">
          Keyboard Shortcuts
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(NAV_MAP).map(([key, { label }]) => (
              <tr key={key} className="border-t border-[color:var(--border-faint)] first:border-0">
                <td className="py-1.5 pr-4 font-mono text-[color:var(--accent)]">
                  g <span className="text-[color:var(--ink-faint)]">then</span> {key}
                </td>
                <td className="py-1.5 text-[color:var(--ink)]">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-[color:var(--ink-faint)]">
          Press <kbd className="font-mono bg-[color:var(--canvas)] px-1 rounded border border-[color:var(--border)]">?</kbd> or <kbd className="font-mono bg-[color:var(--canvas)] px-1 rounded border border-[color:var(--border)]">Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}

export function KeyboardNav() {
  const router = useRouter()
  const [awaitingSecond, setAwaitingSecond] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === '?') {
        setShowHelp((v) => !v)
        return
      }

      if (awaitingSecond) {
        const dest = NAV_MAP[e.key]
        if (dest) router.push(dest.path)
        setAwaitingSecond(false)
        clearTimeout(timer)
        return
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setAwaitingSecond(true)
        timer = setTimeout(() => setAwaitingSecond(false), 1000)
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(timer)
    }
  }, [awaitingSecond, router])

  if (!showHelp) return null

  return <ShortcutOverlay onClose={() => setShowHelp(false)} />
}
