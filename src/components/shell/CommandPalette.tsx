'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isTypingTarget } from '@/lib/keyboard-target'
import { searchShellNav, SHELL_NAV_ITEMS, type ShellNavItem } from '@/lib/navigation'

function routeHint(route: string): string {
  return route === '/' ? 'Home' : route
}

export function CommandPalette() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useMemo(() => searchShellNav(query), [query])
  const activeItem = results[selectedIndex] ?? results[0] ?? null
  const activeId = activeItem ? `command-palette-option-${activeItem.id}` : undefined

  useEffect(() => {
    SHELL_NAV_ITEMS.forEach((item) => router.prefetch(item.route))
  }, [router])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const wantsPalette = key === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey
      if (!wantsPalette) return

      if (isTypingTarget(event.target) && !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    setSelectedIndex(0)
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  useEffect(() => {
    if (!open) return

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        setQuery('')
        setSelectedIndex(0)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => Math.max(index - 1, 0))
        return
      }

      if (event.key === 'Enter') {
        const item = results[selectedIndex] ?? results[0]
        if (!item) return
        event.preventDefault()
        setOpen(false)
        setQuery('')
        setSelectedIndex(0)
        router.push(item.route)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, router, selectedIndex])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function closePalette() {
    setOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }

  function goTo(item: ShellNavItem) {
    closePalette()
    router.push(item.route)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={closePalette}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:var(--border)] px-3 py-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            role="combobox"
            aria-label="Search destinations"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={activeId}
            placeholder="Jump to..."
            className="w-full bg-transparent px-2 py-1.5 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)]"
          />
        </div>

        <div id="command-palette-results" role="listbox" className="max-h-[360px] overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((item, index) => {
              const selected = index === selectedIndex
              return (
                <button
                  key={item.id}
                  id={`command-palette-option-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => goTo(item)}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm',
                    selected
                      ? 'bg-[color:var(--accent-faint)] text-[color:var(--ink)]'
                      : 'text-[color:var(--ink-dim)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink)]',
                  ].join(' ')}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.paletteLabel}</span>
                    <span className="mono mt-0.5 block truncate text-[10px] uppercase tracking-[0.08em] text-[color:var(--ink-faint)]">
                      {routeHint(item.route)}
                    </span>
                  </span>
                  <span className="mono shrink-0 text-[10px] text-[color:var(--ink-faint)]">{item.key}</span>
                </button>
              )
            })
          ) : (
            <div className="px-3 py-8 text-center text-sm text-[color:var(--ink-faint)]">No matches</div>
          )}
        </div>
      </div>
    </div>
  )
}
