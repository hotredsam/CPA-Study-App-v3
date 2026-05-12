'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type HTMLAttributes } from 'react'

interface TabItem {
  id: string
  label: string
  badge?: number
}

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string
  onChange: (id: string) => void
  items: TabItem[]
  className?: string
}

export function Tabs({ value, onChange, items, className = '', ...rest }: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === value))

  const activate = useCallback((index: number) => {
    if (items.length === 0) return
    const normalized = (index + items.length) % items.length
    const next = items[normalized]
    if (!next) return

    onChange(next.id)
    window.requestAnimationFrame(() => tabRefs.current[normalized]?.focus())
  }, [items, onChange])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        activate(index - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        activate(index + 1)
        break
      case 'Home':
        event.preventDefault()
        activate(0)
        break
      case 'End':
        event.preventDefault()
        activate(items.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        activate(index)
        break
    }
  }

  useLayoutEffect(() => {
    const tabWindow = window as Window & { __cpaPendingTabShortcut?: number }
    const pendingIndex = tabWindow.__cpaPendingTabShortcut
    if (typeof pendingIndex !== 'number') return
    tabWindow.__cpaPendingTabShortcut = undefined
    if (pendingIndex >= 0 && pendingIndex < items.length) activate(pendingIndex)
  }, [activate, items.length])

  useEffect(() => {
    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= items.length || index > 8) return
      event.preventDefault()
      activate(index)
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [activate, items.length])

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label'] ?? 'Tabs'}
      {...rest}
      className={`flex min-h-11 gap-0 overflow-x-auto border-b border-[color:var(--border)] ${className}`}
    >
      {items.map((item, index) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={active}
            aria-controls={`tabpanel-${item.id}`}
            aria-keyshortcuts={index < 9 ? `Alt+${index + 1}` : undefined}
            tabIndex={index === activeIndex ? 0 : -1}
            type="button"
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium hov',
              'min-h-11 shrink-0',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
              'focus-visible:outline-[color:var(--accent)]',
              active
                ? 'text-[color:var(--ink)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[color:var(--accent)]'
                : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-dim)]',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-semibold text-white"
                style={{ background: 'var(--accent)' }}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
