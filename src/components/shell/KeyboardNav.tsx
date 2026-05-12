'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isTypingTarget } from '@/lib/keyboard-target'
import { SHELL_NAV_BY_KEY, SHELL_NAV_ITEMS } from '@/lib/navigation'
import { navigateReliably } from '@/lib/reliable-client-nav'

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
            {SHELL_NAV_ITEMS.map(({ key, label }) => (
              <tr key={key} className="border-t border-[color:var(--border-faint)] first:border-0">
                <td className="py-1.5 pr-4 font-mono text-[color:var(--accent)]">
                  {key} <span className="text-[color:var(--ink-faint)]">or</span> g {key}
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
  const [showHelp, setShowHelp] = useState(false)
  const awaitingSecondRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    SHELL_NAV_ITEMS.forEach(({ route }) => router.prefetch(route))
  }, [router])

  useEffect(() => {
    function clearAwaitingSecond() {
      awaitingSecondRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return

      if (e.key === '?') {
        e.preventDefault()
        setShowHelp((v) => !v)
        clearAwaitingSecond()
        return
      }

      const key = e.key.toLowerCase()

      if (awaitingSecondRef.current) {
        const dest = SHELL_NAV_BY_KEY[key]
        if (dest) {
          e.preventDefault()
          navigateReliably(router, dest.route)
          setShowHelp(false)
        }
        clearAwaitingSecond()
        return
      }

      if (key === 'g') {
        e.preventDefault()
        awaitingSecondRef.current = true
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(clearAwaitingSecond, 1000)
        return
      }

      const directDest = SHELL_NAV_BY_KEY[key]
      if (directDest) {
        e.preventDefault()
        navigateReliably(router, directDest.route)
        setShowHelp(false)
      }
    }

    const navWindow = window as Window & { __cpaKeyboardNavReady?: boolean }
    window.addEventListener('keydown', handler)
    navWindow.__cpaKeyboardNavReady = true
    return () => {
      window.removeEventListener('keydown', handler)
      navWindow.__cpaKeyboardNavReady = false
      clearAwaitingSecond()
    }
  }, [router])

  if (!showHelp) return null

  return <ShortcutOverlay onClose={() => setShowHelp(false)} />
}
