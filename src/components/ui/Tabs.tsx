'use client'

interface TabItem {
  id: string
  label: string
  badge?: number
}

interface Props {
  value: string
  onChange: (id: string) => void
  items: TabItem[]
  className?: string
}

export function Tabs({ value, onChange, items, className = '' }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={`flex gap-0 border-b border-[color:var(--border)] ${className}`}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={active}
            aria-controls={`tabpanel-${item.id}`}
            type="button"
            onClick={() => onChange(item.id)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium hov',
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
