'use client'

interface Props {
  on: boolean
  onChange: (value: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ on, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={[
        'relative inline-flex items-center rounded-full shrink-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
        'focus-visible:outline-[color:var(--accent)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        'transition-colors duration-150',
      ].join(' ')}
      style={{
        width: 32,
        height: 18,
        background: on ? 'var(--accent)' : 'var(--track)',
      }}
    >
      <span
        className="absolute bg-white rounded-full shadow"
        style={{
          width: 12,
          height: 12,
          left: on ? 16 : 3,
          transition: 'left 0.15s ease',
        }}
        aria-hidden="true"
      />
    </button>
  )
}
